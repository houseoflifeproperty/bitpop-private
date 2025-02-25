// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This class responds to requests from renderers for the list of plugins, and
// also a proxy object for plugin instances.

#ifndef CONTENT_BROWSER_PLUGIN_SERVICE_IMPL_H_
#define CONTENT_BROWSER_PLUGIN_SERVICE_IMPL_H_

#include <map>
#include <set>
#include <vector>

#include "base/basictypes.h"
#include "base/compiler_specific.h"
#include "base/memory/scoped_vector.h"
#include "base/memory/singleton.h"
#include "base/synchronization/waitable_event_watcher.h"
#include "base/threading/sequenced_worker_pool.h"
#include "base/time.h"
#include "build/build_config.h"
#include "content/browser/plugin_process_host.h"
#include "content/browser/ppapi_plugin_process_host.h"
#include "content/common/content_export.h"
#include "content/public/browser/plugin_service.h"
#include "googleurl/src/gurl.h"
#include "ipc/ipc_channel_handle.h"

#if defined(OS_WIN)
#include "base/memory/scoped_ptr.h"
#include "base/win/registry.h"
#endif

#if defined(OS_POSIX) && !defined(OS_OPENBSD) && !defined(OS_ANDROID)
#include "base/files/file_path_watcher.h"
#endif

namespace base {
class MessageLoopProxy;
}

namespace webkit {
namespace npapi {
class PluginList;
}
}

namespace content {
class BrowserContext;
class PluginDirWatcherDelegate;
class PluginLoaderPosix;
class PluginServiceFilter;
class ResourceContext;
struct PepperPluginInfo;

// base::Bind() has limited arity, and the filter-related methods tend to
// surpass that limit.
struct PluginServiceFilterParams {
  int render_process_id;
  int render_view_id;
  GURL page_url;
  ResourceContext* resource_context;
};

class CONTENT_EXPORT PluginServiceImpl
    : NON_EXPORTED_BASE(public PluginService),
      public base::WaitableEventWatcher::Delegate {
 public:
  // Returns the PluginServiceImpl singleton.
  static PluginServiceImpl* GetInstance();

  // PluginService implementation:
  virtual void Init() OVERRIDE;
  virtual void StartWatchingPlugins() OVERRIDE;
  virtual bool GetPluginInfoArray(
      const GURL& url,
      const std::string& mime_type,
      bool allow_wildcard,
      std::vector<webkit::WebPluginInfo>* info,
      std::vector<std::string>* actual_mime_types) OVERRIDE;
  virtual bool GetPluginInfo(int render_process_id,
                             int render_view_id,
                             ResourceContext* context,
                             const GURL& url,
                             const GURL& page_url,
                             const std::string& mime_type,
                             bool allow_wildcard,
                             bool* is_stale,
                             webkit::WebPluginInfo* info,
                             std::string* actual_mime_type) OVERRIDE;
  virtual bool GetPluginInfoByPath(const FilePath& plugin_path,
                                   webkit::WebPluginInfo* info) OVERRIDE;
  virtual string16 GetPluginDisplayNameByPath(const FilePath& path) OVERRIDE;
  virtual void GetPlugins(const GetPluginsCallback& callback) OVERRIDE;
  virtual PepperPluginInfo* GetRegisteredPpapiPluginInfo(
      const FilePath& plugin_path) OVERRIDE;
  virtual void SetFilter(PluginServiceFilter* filter) OVERRIDE;
  virtual PluginServiceFilter* GetFilter() OVERRIDE;
  virtual void ForcePluginShutdown(const FilePath& plugin_path) OVERRIDE;
  virtual bool IsPluginUnstable(const FilePath& plugin_path) OVERRIDE;
  virtual void RefreshPlugins() OVERRIDE;
  virtual void AddExtraPluginPath(const FilePath& path) OVERRIDE;
  virtual void AddExtraPluginDir(const FilePath& path) OVERRIDE;
  virtual void RemoveExtraPluginPath(const FilePath& path) OVERRIDE;
  virtual void UnregisterInternalPlugin(const FilePath& path) OVERRIDE;
  virtual void RegisterInternalPlugin(
      const webkit::WebPluginInfo& info, bool add_at_beginning) OVERRIDE;
  virtual void GetInternalPlugins(
      std::vector<webkit::WebPluginInfo>* plugins) OVERRIDE;
  virtual webkit::npapi::PluginList* GetPluginList() OVERRIDE;
  virtual void SetPluginListForTesting(
      webkit::npapi::PluginList* plugin_list) OVERRIDE;
#if defined(OS_MACOSX)
  virtual void AppActivated() OVERRIDE;
#endif

  // Returns the plugin process host corresponding to the plugin process that
  // has been started by this service. This will start a process to host the
  // 'plugin_path' if needed. If the process fails to start, the return value
  // is NULL. Must be called on the IO thread.
  PluginProcessHost* FindOrStartNpapiPluginProcess(
      const FilePath& plugin_path);
  PpapiPluginProcessHost* FindOrStartPpapiPluginProcess(
      const FilePath& plugin_path,
      const FilePath& profile_data_directory,
      PpapiPluginProcessHost::PluginClient* client);
  PpapiPluginProcessHost* FindOrStartPpapiBrokerProcess(
      const FilePath& plugin_path);

  // Opens a channel to a plugin process for the given mime type, starting
  // a new plugin process if necessary.  This must be called on the IO thread
  // or else a deadlock can occur.
  void OpenChannelToNpapiPlugin(int render_process_id,
                                int render_view_id,
                                const GURL& url,
                                const GURL& page_url,
                                const std::string& mime_type,
                                PluginProcessHost::Client* client);
  void OpenChannelToPpapiPlugin(const FilePath& plugin_path,
                                const FilePath& profile_data_directory,
                                PpapiPluginProcessHost::PluginClient* client);
  void OpenChannelToPpapiBroker(const FilePath& path,
                                PpapiPluginProcessHost::BrokerClient* client);

  // Cancels opening a channel to a NPAPI plugin.
  void CancelOpenChannelToNpapiPlugin(PluginProcessHost::Client* client);

  // Used to monitor plug-in stability.
  void RegisterPluginCrash(const FilePath& plugin_path);

 private:
  friend struct DefaultSingletonTraits<PluginServiceImpl>;

  // Creates the PluginServiceImpl object, but doesn't actually build the plugin
  // list yet.  It's generated lazily.
  PluginServiceImpl();
  virtual ~PluginServiceImpl();

  // base::WaitableEventWatcher::Delegate implementation.
  virtual void OnWaitableEventSignaled(
      base::WaitableEvent* waitable_event) OVERRIDE;

  // Returns the plugin process host corresponding to the plugin process that
  // has been started by this service. Returns NULL if no process has been
  // started.
  PluginProcessHost* FindNpapiPluginProcess(const FilePath& plugin_path);
  PpapiPluginProcessHost* FindPpapiPluginProcess(
      const FilePath& plugin_path,
      const FilePath& profile_data_directory);
  PpapiPluginProcessHost* FindPpapiBrokerProcess(const FilePath& broker_path);

  void RegisterPepperPlugins();

#if defined(OS_WIN)
  // Run on the blocking pool to load the plugins synchronously.
  void GetPluginsInternal(base::MessageLoopProxy* target_loop,
                          const GetPluginsCallback& callback);
#endif

  // Binding directly to GetAllowedPluginForOpenChannelToPlugin() isn't possible
  // because more arity is needed <http://crbug.com/98542>. This just forwards.
  void ForwardGetAllowedPluginForOpenChannelToPlugin(
      const PluginServiceFilterParams& params,
      const GURL& url,
      const std::string& mime_type,
      PluginProcessHost::Client* client,
      const std::vector<webkit::WebPluginInfo>&);
  // Helper so we can do the plugin lookup on the FILE thread.
  void GetAllowedPluginForOpenChannelToPlugin(
      int render_process_id,
      int render_view_id,
      const GURL& url,
      const GURL& page_url,
      const std::string& mime_type,
      PluginProcessHost::Client* client,
      ResourceContext* resource_context);

  // Helper so we can finish opening the channel after looking up the
  // plugin.
  void FinishOpenChannelToPlugin(
      const FilePath& plugin_path,
      PluginProcessHost::Client* client);

#if defined(OS_POSIX) && !defined(OS_OPENBSD) && !defined(OS_ANDROID)
  // Registers a new FilePathWatcher for a given path.
  static void RegisterFilePathWatcher(
      base::files::FilePathWatcher* watcher,
      const FilePath& path,
      base::files::FilePathWatcher::Delegate* delegate);
#endif

  // The plugin list instance.
  webkit::npapi::PluginList* plugin_list_;

#if defined(OS_WIN)
  // Registry keys for getting notifications when new plugins are installed.
  base::win::RegKey hkcu_key_;
  base::win::RegKey hklm_key_;
  scoped_ptr<base::WaitableEvent> hkcu_event_;
  scoped_ptr<base::WaitableEvent> hklm_event_;
  base::WaitableEventWatcher hkcu_watcher_;
  base::WaitableEventWatcher hklm_watcher_;
#endif

#if defined(OS_POSIX) && !defined(OS_OPENBSD) && !defined(OS_ANDROID)
  ScopedVector<base::files::FilePathWatcher> file_watchers_;
  scoped_refptr<PluginDirWatcherDelegate> file_watcher_delegate_;
#endif

  std::vector<PepperPluginInfo> ppapi_plugins_;

  // Weak pointer; outlives us.
  PluginServiceFilter* filter_;

  std::set<PluginProcessHost::Client*> pending_plugin_clients_;

#if defined(OS_WIN)
  // Used to sequentialize loading plug-ins from disk.
  base::SequencedWorkerPool::SequenceToken plugin_list_token_;
#endif
#if defined(OS_POSIX)
  scoped_refptr<PluginLoaderPosix> plugin_loader_;
#endif

  // Used to detect if a given plug-in is crashing over and over.
  std::map<FilePath, std::vector<base::Time> > crash_times_;

  DISALLOW_COPY_AND_ASSIGN(PluginServiceImpl);
};

}  // namespace content

#endif  // CONTENT_BROWSER_PLUGIN_SERVICE_IMPL_H_
