// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "chrome/browser/ui/webui/ntp/new_tab_page_sync_handler.h"

#include <vector>

#include "base/bind.h"
#include "base/bind_helpers.h"
#include "base/string_split.h"
#include "base/string_util.h"
#include "base/utf_string_conversions.h"
#include "base/values.h"
#include "chrome/browser/net/chrome_url_request_context.h"
#include "chrome/browser/prefs/pref_service.h"
#include "chrome/browser/profiles/profile.h"
#include "chrome/browser/signin/signin_manager.h"
#include "chrome/browser/signin/signin_manager_factory.h"
#include "chrome/browser/sync/profile_sync_service.h"
#include "chrome/browser/sync/profile_sync_service_factory.h"
#include "chrome/browser/ui/browser.h"
#include "chrome/browser/ui/browser_finder.h"
#include "chrome/browser/ui/chrome_pages.h"
#include "chrome/browser/ui/webui/signin/login_ui_service.h"
#include "chrome/browser/ui/webui/signin/login_ui_service_factory.h"
#include "chrome/common/pref_names.h"
#include "content/public/browser/render_view_host.h"
#include "content/public/browser/web_ui.h"
#include "grit/generated_resources.h"
#include "net/cookies/cookie_monster.h"
#include "net/url_request/url_request_context.h"
#include "ui/base/l10n/l10n_util.h"

// Default URL for the sync web interface.
//
// TODO(idana): when we figure out how we are going to allow third parties to
// plug in their own sync engine, we should allow this value to be
// configurable.
static const char kSyncDefaultViewOnlineUrl[] = "http://docs.google.com";

NewTabPageSyncHandler::NewTabPageSyncHandler() : sync_service_(NULL),
  waiting_for_initial_page_load_(true) {
}

NewTabPageSyncHandler::~NewTabPageSyncHandler() {
  if (sync_service_)
    sync_service_->RemoveObserver(this);
}

// static
NewTabPageSyncHandler::MessageType
    NewTabPageSyncHandler::FromSyncStatusMessageType(
        sync_ui_util::MessageType type) {
  switch (type) {
    case sync_ui_util::SYNC_ERROR:
      return SYNC_ERROR;
    case sync_ui_util::SYNC_PROMO:
      return SYNC_PROMO;
    case sync_ui_util::PRE_SYNCED:
    case sync_ui_util::SYNCED:
    default:
      return HIDE;
  }
}

void NewTabPageSyncHandler::RegisterMessages() {
  sync_service_ = ProfileSyncServiceFactory::GetInstance()->GetForProfile(
      Profile::FromWebUI(web_ui()));
  DCHECK(sync_service_);  // This shouldn't get called by an incognito NTP.
  DCHECK(!sync_service_->IsManaged());  // And neither if sync is managed.
  sync_service_->AddObserver(this);

  web_ui()->RegisterMessageCallback("GetSyncMessage",
      base::Bind(&NewTabPageSyncHandler::HandleGetSyncMessage,
                 base::Unretained(this)));
  web_ui()->RegisterMessageCallback("SyncLinkClicked",
      base::Bind(&NewTabPageSyncHandler::HandleSyncLinkClicked,
                 base::Unretained(this)));
}

void NewTabPageSyncHandler::HandleGetSyncMessage(const ListValue* args) {
  waiting_for_initial_page_load_ = false;
  BuildAndSendSyncStatus();
}

void NewTabPageSyncHandler::HideSyncStatusSection() {
  SendSyncMessageToPage(HIDE, std::string(), std::string());
}

void NewTabPageSyncHandler::BuildAndSendSyncStatus() {
  DCHECK(!waiting_for_initial_page_load_);

  // Hide the sync status section if sync is managed or disabled entirely.
  if (!sync_service_ || sync_service_->IsManaged()) {
    HideSyncStatusSection();
    return;
  }

  // Don't show sync status if setup is not complete.
  if (!sync_service_->HasSyncSetupCompleted()) {
    return;
  }

  // Once sync has been enabled, the supported "sync statuses" for the NNTP
  // from the user's perspective are:
  //
  // "Sync error", when we can't authenticate or establish a connection with
  //               the sync server (appropriate information appended to
  //               message).
  string16 status_msg;
  string16 link_text;
  SigninManager* signin = SigninManagerFactory::GetForProfile(
      Profile::FromWebUI(web_ui()));

  sync_ui_util::MessageType type =
      sync_ui_util::GetStatusLabelsForNewTabPage(sync_service_,
                                                 *signin,
                                                 &status_msg,
                                                 &link_text);
  SendSyncMessageToPage(FromSyncStatusMessageType(type),
                        UTF16ToUTF8(status_msg), UTF16ToUTF8(link_text));
}

void NewTabPageSyncHandler::HandleSyncLinkClicked(const ListValue* args) {
  DCHECK(!waiting_for_initial_page_load_);
  DCHECK(sync_service_);
  if (!sync_service_->IsSyncEnabled())
    return;
  Browser* browser =
      chrome::FindBrowserWithWebContents(web_ui()->GetWebContents());
  if (!browser || browser->IsAttemptingToCloseBrowser())
    return;
  chrome::ShowSyncSetup(browser, SyncPromoUI::SOURCE_NTP_LINK);

  if (sync_service_->HasSyncSetupCompleted()) {
    string16 user = UTF8ToUTF16(SigninManagerFactory::GetForProfile(
        Profile::FromWebUI(web_ui()))->GetAuthenticatedUsername());
    DictionaryValue value;
    value.SetString("syncEnabledMessage",
                    l10n_util::GetStringFUTF16(IDS_SYNC_NTP_SYNCED_TO,
                    user));
    web_ui()->CallJavascriptFunction("ntp.syncAlreadyEnabled", value);
  } else {
    ProfileSyncService::SyncEvent(ProfileSyncService::START_FROM_NTP);
  }
}

void NewTabPageSyncHandler::OnStateChanged() {
  // Don't do anything if the page has not yet loaded.
  if (waiting_for_initial_page_load_)
    return;
  BuildAndSendSyncStatus();
}

void NewTabPageSyncHandler::SendSyncMessageToPage(
    MessageType type, std::string msg,
    std::string linktext) {
  DictionaryValue value;
  std::string user;
  std::string title;
  std::string linkurl;

  // If there is nothing to show, we should hide the sync section altogether.
  if (type == HIDE || (msg.empty() && linktext.empty())) {
    value.SetBoolean("syncsectionisvisible", false);
  } else {
    if (type == SYNC_ERROR)
      title = l10n_util::GetStringUTF8(IDS_SYNC_NTP_SYNC_SECTION_ERROR_TITLE);
    else if (type == SYNC_PROMO)
      title = l10n_util::GetStringUTF8(IDS_SYNC_NTP_SYNC_SECTION_PROMO_TITLE);
    else
      NOTREACHED();

    value.SetBoolean("syncsectionisvisible", true);
    value.SetString("msg", msg);
    value.SetString("title", title);
    if (linktext.empty()) {
      value.SetBoolean("linkisvisible", false);
    } else {
      value.SetBoolean("linkisvisible", true);
      value.SetString("linktext", linktext);

      // The only time we set the URL is when the user is synced and we need to
      // show a link to a web interface (e.g. http://docs.google.com). When we
      // set that URL, HandleSyncLinkClicked won't be called when the user
      // clicks on the link.
      if (linkurl.empty()) {
        value.SetBoolean("linkurlisset", false);
      } else {
        value.SetBoolean("linkurlisset", true);
        value.SetString("linkurl", linkurl);
      }
    }
  }
  web_ui()->CallJavascriptFunction("ntp.syncMessageChanged", value);
}
