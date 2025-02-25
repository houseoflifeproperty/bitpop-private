// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "chrome/renderer/extensions/extension_helper.h"

#include "base/bind.h"
#include "base/bind_helpers.h"
#include "base/command_line.h"
#include "base/json/json_string_value_serializer.h"
#include "base/lazy_instance.h"
#include "base/message_loop.h"
#include "base/utf_string_conversions.h"
#include "chrome/common/chrome_switches.h"
#include "chrome/common/extensions/extension_messages.h"
#include "chrome/common/render_messages.h"
#include "chrome/common/url_constants.h"
#include "chrome/common/view_type.h"
#include "chrome/renderer/extensions/chrome_v8_context.h"
#include "chrome/renderer/extensions/dispatcher.h"
#include "chrome/renderer/extensions/miscellaneous_bindings.h"
#include "chrome/renderer/extensions/user_script_scheduler.h"
#include "chrome/renderer/extensions/user_script_slave.h"
#include "content/public/renderer/render_view.h"
#include "content/public/renderer/render_view_visitor.h"
#include "extensions/common/constants.h"
#include "third_party/WebKit/Source/WebKit/chromium/public/platform/WebURLRequest.h"
#include "third_party/WebKit/Source/WebKit/chromium/public/WebConsoleMessage.h"
#include "third_party/WebKit/Source/WebKit/chromium/public/WebDocument.h"
#include "third_party/WebKit/Source/WebKit/chromium/public/WebFrame.h"
#include "third_party/WebKit/Source/WebKit/chromium/public/WebScopedUserGesture.h"
#include "third_party/WebKit/Source/WebKit/chromium/public/WebView.h"
#include "webkit/glue/image_resource_fetcher.h"
#include "webkit/glue/resource_fetcher.h"

namespace base {
class ListValue;
}  // namespace base

using content::ConsoleMessageLevel;
using WebKit::WebConsoleMessage;
using WebKit::WebDataSource;
using WebKit::WebFrame;
using WebKit::WebURLRequest;
using WebKit::WebScopedUserGesture;
using WebKit::WebView;
using webkit_glue::ImageResourceFetcher;
using webkit_glue::ResourceFetcher;

namespace extensions {

namespace {
// Keeps a mapping from the frame pointer to a UserScriptScheduler object.
// We store this mapping per process, because a frame can jump from one
// document to another with adoptNode, and so having the object be a
// RenderViewObserver means it might miss some notifications after it moves.
typedef std::map<WebFrame*, UserScriptScheduler*> SchedulerMap;
static base::LazyInstance<SchedulerMap> g_schedulers =
    LAZY_INSTANCE_INITIALIZER;

// A RenderViewVisitor class that iterates through the set of available
// views, looking for a view of the given type, in the given browser window
// and within the given extension.
// Used to accumulate the list of views associated with an extension.
class ViewAccumulator : public content::RenderViewVisitor {
 public:
  ViewAccumulator(const std::string& extension_id,
                  int browser_window_id,
                  chrome::ViewType view_type)
      : extension_id_(extension_id),
        browser_window_id_(browser_window_id),
        view_type_(view_type) {
  }

  std::vector<content::RenderView*> views() { return views_; }

  // Returns false to terminate the iteration.
  virtual bool Visit(content::RenderView* render_view) {
    ExtensionHelper* helper = ExtensionHelper::Get(render_view);
    if (!ViewTypeMatches(helper->view_type(), view_type_))
      return true;

    GURL url = render_view->GetWebView()->mainFrame()->document().url();
    if (!url.SchemeIs(extensions::kExtensionScheme))
      return true;
    const std::string& extension_id = url.host();
    if (extension_id != extension_id_)
      return true;

    if (browser_window_id_ != extension_misc::kUnknownWindowId &&
        helper->browser_window_id() != browser_window_id_) {
      return true;
    }

    views_.push_back(render_view);

    if (view_type_ == chrome::VIEW_TYPE_EXTENSION_BACKGROUND_PAGE)
      return false;  // There can be only one...
    return true;
  }

 private:
  // Returns true if |type| "isa" |match|.
  static bool ViewTypeMatches(chrome::ViewType type, chrome::ViewType match) {
    if (type == match)
      return true;

    // INVALID means match all.
    if (match == chrome::VIEW_TYPE_INVALID)
      return true;

    return false;
  }

  std::string extension_id_;
  int browser_window_id_;
  chrome::ViewType view_type_;
  std::vector<content::RenderView*> views_;
};

}  // namespace

// static
std::vector<content::RenderView*> ExtensionHelper::GetExtensionViews(
    const std::string& extension_id,
    int browser_window_id,
    chrome::ViewType view_type) {
  ViewAccumulator accumulator(extension_id, browser_window_id, view_type);
  content::RenderView::ForEach(&accumulator);
  return accumulator.views();
}

// static
content::RenderView* ExtensionHelper::GetBackgroundPage(
    const std::string& extension_id) {
  ViewAccumulator accumulator(extension_id, extension_misc::kUnknownWindowId,
                              chrome::VIEW_TYPE_EXTENSION_BACKGROUND_PAGE);
  content::RenderView::ForEach(&accumulator);
  CHECK_LE(accumulator.views().size(), 1u);
  if (accumulator.views().size() == 0)
    return NULL;
  return accumulator.views()[0];
}

ExtensionHelper::ExtensionHelper(content::RenderView* render_view,
                                 Dispatcher* dispatcher)
    : content::RenderViewObserver(render_view),
      content::RenderViewObserverTracker<ExtensionHelper>(render_view),
      dispatcher_(dispatcher),
      pending_app_icon_requests_(0),
      view_type_(chrome::VIEW_TYPE_INVALID),
      tab_id_(-1),
      browser_window_id_(-1) {
}

ExtensionHelper::~ExtensionHelper() {
}

bool ExtensionHelper::InstallWebApplicationUsingDefinitionFile(
    WebFrame* frame, string16* error) {
  // There is an issue of drive-by installs with the below implementation. A web
  // site could force a user to install an app by timing the dialog to come up
  // just before the user clicks.
  //
  // We do show a success UI that allows users to uninstall, but it seems that
  // we might still want to put up an infobar before showing the install dialog.
  //
  // TODO(aa): Figure out this issue before removing the kEnableCrxlessWebApps
  // switch.
  if (!CommandLine::ForCurrentProcess()->HasSwitch(
          switches::kEnableCrxlessWebApps)) {
    *error = ASCIIToUTF16("CRX-less web apps aren't enabled.");
    return false;
  }

  if (frame != frame->top()) {
    *error = ASCIIToUTF16("Applications can only be installed from the top "
                          "frame.");
    return false;
  }

  if (pending_app_info_.get()) {
    *error = ASCIIToUTF16("An application install is already in progress.");
    return false;
  }

  pending_app_info_.reset(new WebApplicationInfo());
  if (!web_apps::ParseWebAppFromWebDocument(frame, pending_app_info_.get(),
                                            error)) {
    return false;
  }

  if (!pending_app_info_->manifest_url.is_valid()) {
    *error = ASCIIToUTF16("Web application definition not found or invalid.");
    return false;
  }

  app_definition_fetcher_.reset(new ResourceFetcher(
      pending_app_info_->manifest_url, render_view()->GetWebView()->mainFrame(),
      WebURLRequest::TargetIsSubresource,
      base::Bind(&ExtensionHelper::DidDownloadApplicationDefinition,
                 base::Unretained(this))));
  return true;
}

bool ExtensionHelper::OnMessageReceived(const IPC::Message& message) {
  bool handled = true;
  IPC_BEGIN_MESSAGE_MAP(ExtensionHelper, message)
    IPC_MESSAGE_HANDLER(ExtensionMsg_Response, OnExtensionResponse)
    IPC_MESSAGE_HANDLER(ExtensionMsg_MessageInvoke, OnExtensionMessageInvoke)
    IPC_MESSAGE_HANDLER(ExtensionMsg_DispatchOnConnect,
                        OnExtensionDispatchOnConnect)
    IPC_MESSAGE_HANDLER(ExtensionMsg_DeliverMessage, OnExtensionDeliverMessage)
    IPC_MESSAGE_HANDLER(ExtensionMsg_DispatchOnDisconnect,
                        OnExtensionDispatchOnDisconnect)
    IPC_MESSAGE_HANDLER(ExtensionMsg_ExecuteCode, OnExecuteCode)
    IPC_MESSAGE_HANDLER(ExtensionMsg_GetApplicationInfo, OnGetApplicationInfo)
    IPC_MESSAGE_HANDLER(ExtensionMsg_SetTabId, OnSetTabId)
    IPC_MESSAGE_HANDLER(ExtensionMsg_UpdateBrowserWindowId,
                        OnUpdateBrowserWindowId)
    IPC_MESSAGE_HANDLER(ExtensionMsg_NotifyRenderViewType,
                        OnNotifyRendererViewType)
    IPC_MESSAGE_HANDLER(ExtensionMsg_AddMessageToConsole,
                        OnAddMessageToConsole)
    IPC_MESSAGE_HANDLER(ExtensionMsg_AppWindowClosed,
                        OnAppWindowClosed);
    IPC_MESSAGE_UNHANDLED(handled = false)
  IPC_END_MESSAGE_MAP()
  return handled;
}

void ExtensionHelper::DidFinishDocumentLoad(WebFrame* frame) {
  dispatcher_->user_script_slave()->InjectScripts(
      frame, UserScript::DOCUMENT_END);

  SchedulerMap::iterator i = g_schedulers.Get().find(frame);
  if (i != g_schedulers.Get().end())
    i->second->DidFinishDocumentLoad();
}

void ExtensionHelper::DidFinishLoad(WebKit::WebFrame* frame) {
  SchedulerMap::iterator i = g_schedulers.Get().find(frame);
  if (i != g_schedulers.Get().end())
    i->second->DidFinishLoad();
}

void ExtensionHelper::DidCreateDocumentElement(WebFrame* frame) {
  dispatcher_->user_script_slave()->InjectScripts(
      frame, UserScript::DOCUMENT_START);
  SchedulerMap::iterator i = g_schedulers.Get().find(frame);
  if (i != g_schedulers.Get().end())
    i->second->DidCreateDocumentElement();

  dispatcher_->DidCreateDocumentElement(frame);
}

void ExtensionHelper::DidStartProvisionalLoad(WebKit::WebFrame* frame) {
  SchedulerMap::iterator i = g_schedulers.Get().find(frame);
  if (i != g_schedulers.Get().end())
    i->second->DidStartProvisionalLoad();
}

void ExtensionHelper::DraggableRegionsChanged(WebKit::WebFrame* frame) {
  WebKit::WebVector<WebKit::WebDraggableRegion> webregions =
      frame->document().draggableRegions();
  std::vector<extensions::DraggableRegion> regions;
  for (size_t i = 0; i < webregions.size(); ++i) {
    extensions::DraggableRegion region;
    region.bounds = webregions[i].bounds;
    region.draggable = webregions[i].draggable;
    regions.push_back(region);
  }
  Send(new ExtensionHostMsg_UpdateDraggableRegions(routing_id(), regions));
}

void ExtensionHelper::FrameDetached(WebFrame* frame) {
  // This could be called before DidCreateDataSource, in which case the frame
  // won't be in the map.
  SchedulerMap::iterator i = g_schedulers.Get().find(frame);
  if (i == g_schedulers.Get().end())
    return;

  delete i->second;
  g_schedulers.Get().erase(i);
}

void ExtensionHelper::DidCreateDataSource(WebFrame* frame, WebDataSource* ds) {
  // If there are any app-related fetches in progress, they can be cancelled now
  // since we have navigated away from the page that created them.
  if (!frame->parent()) {
    app_icon_fetchers_.clear();
    app_definition_fetcher_.reset(NULL);
  }

  // Check first if we created a scheduler for the frame, since this function
  // gets called for navigations within the document.
  if (g_schedulers.Get().count(frame))
    return;

  g_schedulers.Get()[frame] = new UserScriptScheduler(frame, dispatcher_);
}

void ExtensionHelper::OnExtensionResponse(int request_id,
                                          bool success,
                                          const base::ListValue& response,
                                          const std::string& error) {
  dispatcher_->OnExtensionResponse(request_id,
                                   success,
                                   response,
                                   error);
}

void ExtensionHelper::OnExtensionMessageInvoke(const std::string& extension_id,
                                               const std::string& function_name,
                                               const base::ListValue& args,
                                               const GURL& event_url,
                                               bool user_gesture) {
  scoped_ptr<WebScopedUserGesture> web_user_gesture;
  if (user_gesture) {
    web_user_gesture.reset(new WebScopedUserGesture);
  }

  dispatcher_->v8_context_set().DispatchChromeHiddenMethod(
      extension_id, function_name, args, render_view(), event_url);
}

void ExtensionHelper::OnExtensionDispatchOnConnect(
    int target_port_id,
    const std::string& channel_name,
    const std::string& tab_json,
    const std::string& source_extension_id,
    const std::string& target_extension_id) {
  MiscellaneousBindings::DispatchOnConnect(
      dispatcher_->v8_context_set().GetAll(),
      target_port_id, channel_name, tab_json,
      source_extension_id, target_extension_id,
      render_view());
}

void ExtensionHelper::OnExtensionDeliverMessage(int target_id,
                                                const std::string& message) {
  MiscellaneousBindings::DeliverMessage(dispatcher_->v8_context_set().GetAll(),
                                        target_id,
                                        message,
                                        render_view());
}

void ExtensionHelper::OnExtensionDispatchOnDisconnect(int port_id,
                                                      bool connection_error) {
  MiscellaneousBindings::DispatchOnDisconnect(
      dispatcher_->v8_context_set().GetAll(),
      port_id, connection_error,
      render_view());
}

void ExtensionHelper::OnExecuteCode(
    const ExtensionMsg_ExecuteCode_Params& params) {
  WebView* webview = render_view()->GetWebView();
  WebFrame* main_frame = webview->mainFrame();
  if (!main_frame) {
    ListValue val;
    Send(new ExtensionHostMsg_ExecuteCodeFinished(
        routing_id(), params.request_id, "No main frame", -1, GURL(""), val));
    return;
  }

  // chrome.tabs.executeScript() only supports execution in either the top frame
  // or all frames.  We handle both cases in the top frame.
  SchedulerMap::iterator i = g_schedulers.Get().find(main_frame);
  if (i != g_schedulers.Get().end())
    i->second->ExecuteCode(params);
}

void ExtensionHelper::OnGetApplicationInfo(int page_id) {
  WebApplicationInfo app_info;
  if (page_id == render_view()->GetPageId()) {
    string16 error;
    web_apps::ParseWebAppFromWebDocument(
        render_view()->GetWebView()->mainFrame(), &app_info, &error);
  }

  // Prune out any data URLs in the set of icons.  The browser process expects
  // any icon with a data URL to have originated from a favicon.  We don't want
  // to decode arbitrary data URLs in the browser process.  See
  // http://b/issue?id=1162972
  for (size_t i = 0; i < app_info.icons.size(); ++i) {
    if (app_info.icons[i].url.SchemeIs(chrome::kDataScheme)) {
      app_info.icons.erase(app_info.icons.begin() + i);
      --i;
    }
  }

  Send(new ExtensionHostMsg_DidGetApplicationInfo(
      routing_id(), page_id, app_info));
}

void ExtensionHelper::OnNotifyRendererViewType(chrome::ViewType type) {
  view_type_ = type;
}

void ExtensionHelper::OnSetTabId(int init_tab_id) {
  CHECK_EQ(tab_id_, -1);
  CHECK_GE(init_tab_id, 0);
  tab_id_ = init_tab_id;
}

void ExtensionHelper::OnUpdateBrowserWindowId(int window_id) {
  browser_window_id_ = window_id;
}

void ExtensionHelper::OnAddMessageToConsole(ConsoleMessageLevel level,
                                            const std::string& message) {
  AddMessageToRootConsole(level, UTF8ToUTF16(message));
}

void ExtensionHelper::OnAppWindowClosed() {
  v8::HandleScope scope;
  v8::Handle<v8::Context> script_context =
      render_view()->GetWebView()->mainFrame()->mainWorldScriptContext();
  ChromeV8Context* chrome_v8_context =
      dispatcher_->v8_context_set().GetByV8Context(script_context);
  chrome_v8_context->CallChromeHiddenMethod("OnAppWindowClosed", 0, NULL, NULL);
}

void ExtensionHelper::DidDownloadApplicationDefinition(
    const WebKit::WebURLResponse& response,
    const std::string& data) {
  scoped_ptr<WebApplicationInfo> app_info(
      pending_app_info_.release());

  JSONStringValueSerializer serializer(data);
  int error_code = 0;
  std::string error_message;
  scoped_ptr<Value> result(serializer.Deserialize(&error_code, &error_message));
  if (!result.get()) {
    AddMessageToRootConsole(
        content::CONSOLE_MESSAGE_LEVEL_ERROR, UTF8ToUTF16(error_message));
    return;
  }

  string16 error_message_16;
  if (!web_apps::ParseWebAppFromDefinitionFile(result.get(), app_info.get(),
                                               &error_message_16)) {
    AddMessageToRootConsole(
        content::CONSOLE_MESSAGE_LEVEL_ERROR, error_message_16);
    return;
  }

  if (!app_info->icons.empty()) {
    pending_app_info_.reset(app_info.release());
    pending_app_icon_requests_ =
        static_cast<int>(pending_app_info_->icons.size());
    for (size_t i = 0; i < pending_app_info_->icons.size(); ++i) {
      app_icon_fetchers_.push_back(linked_ptr<ImageResourceFetcher>(
          new ImageResourceFetcher(
              pending_app_info_->icons[i].url,
              render_view()->GetWebView()->mainFrame(),
              static_cast<int>(i),
              pending_app_info_->icons[i].width,
              WebURLRequest::TargetIsFavicon,
              base::Bind(
                  &ExtensionHelper::DidDownloadApplicationIcon,
                  base::Unretained(this)))));
    }
  } else {
    Send(new ExtensionHostMsg_InstallApplication(routing_id(), *app_info));
  }
}

void ExtensionHelper::DidDownloadApplicationIcon(ImageResourceFetcher* fetcher,
                                            const SkBitmap& image) {
  pending_app_info_->icons[fetcher->id()].data = image;

  // Remove the image fetcher from our pending list. We're in the callback from
  // ImageResourceFetcher, best to delay deletion.
  ImageResourceFetcherList::iterator i;
  for (i = app_icon_fetchers_.begin(); i != app_icon_fetchers_.end(); ++i) {
    if (i->get() == fetcher) {
      i->release();
      app_icon_fetchers_.erase(i);
      break;
    }
  }

  // We're in the callback from the ImageResourceFetcher, best to delay
  // deletion.
  MessageLoop::current()->DeleteSoon(FROM_HERE, fetcher);

  if (--pending_app_icon_requests_ > 0)
    return;

  // There is a maximum size of IPC on OS X and Linux that we have run into in
  // some situations. We're not sure what it is, but our hypothesis is in the
  // neighborhood of 1 MB.
  //
  // To be on the safe side, we give ourselves 128 KB for just the image data.
  // This should be more than enough for 128, 48, and 16 px 32-bit icons. If we
  // want to start allowing larger icons (see bug 63406), we'll have to either
  // experiment mor ewith this and find the real limit, or else come up with
  // some alternative way to transmit the icon data to the browser process.
  //
  // See also: bug 63729.
  const size_t kMaxIconSize = 1024 * 128;
  size_t actual_icon_size = 0;
  for (size_t i = 0; i < pending_app_info_->icons.size(); ++i) {
    size_t current_size = pending_app_info_->icons[i].data.getSize();
    if (current_size > kMaxIconSize - actual_icon_size) {
      AddMessageToRootConsole(
          content::CONSOLE_MESSAGE_LEVEL_ERROR,
          ASCIIToUTF16("Icons are too large. "
              "Maximum total size for app icons is 128 KB."));
      return;
    }
    actual_icon_size += current_size;
  }

  Send(new ExtensionHostMsg_InstallApplication(
      routing_id(), *pending_app_info_));
  pending_app_info_.reset(NULL);
}

void ExtensionHelper::AddMessageToRootConsole(ConsoleMessageLevel level,
                                              const string16& message) {
  if (render_view()->GetWebView() && render_view()->GetWebView()->mainFrame()) {
    WebConsoleMessage::Level target_level = WebConsoleMessage::LevelLog;
    switch (level) {
      case content::CONSOLE_MESSAGE_LEVEL_TIP:
        target_level = WebConsoleMessage::LevelTip;
        break;
      case content::CONSOLE_MESSAGE_LEVEL_LOG:
        target_level = WebConsoleMessage::LevelLog;
        break;
      case content::CONSOLE_MESSAGE_LEVEL_WARNING:
        target_level = WebConsoleMessage::LevelWarning;
        break;
      case content::CONSOLE_MESSAGE_LEVEL_ERROR:
        target_level = WebConsoleMessage::LevelError;
        break;
    }
    render_view()->GetWebView()->mainFrame()->addMessageToConsole(
        WebConsoleMessage(target_level, message));
  }
}

}  // namespace extensions
