// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "base/command_line.h"
#include "chrome/browser/extensions/app_notify_channel_setup.h"
#include "chrome/browser/extensions/extension_browsertest.h"
#include "chrome/browser/extensions/extension_service.h"
#include "chrome/browser/extensions/extension_system.h"
#include "chrome/browser/profiles/profile.h"
#include "chrome/browser/ui/browser.h"
#include "chrome/browser/ui/extensions/application_launch.h"
#include "chrome/common/chrome_switches.h"
#include "chrome/common/extensions/extension.h"
#include "chrome/test/base/ui_test_utils.h"
#include "content/public/browser/browser_thread.h"

using content::BrowserThread;

class AppNotificationTest : public ExtensionBrowserTest {};

namespace extensions {

namespace {

// Our test app will call the getNotificationChannel API using this client id.
static const char* kExpectedClientId = "dummy_client_id";

class Interceptor : public AppNotifyChannelSetup::InterceptorForTests {
 public:
  Interceptor() : was_called_(false) {}
  virtual ~Interceptor() {}

  virtual void DoIntercept(
      const AppNotifyChannelSetup* setup,
      std::string* result_channel_id,
      AppNotifyChannelSetup::SetupError* result_error) OVERRIDE {
    EXPECT_TRUE(BrowserThread::CurrentlyOn(BrowserThread::UI));
    EXPECT_TRUE(setup->client_id() == std::string(kExpectedClientId));
    *result_channel_id = std::string("1234");
    *result_error = AppNotifyChannelSetup::NONE;
    was_called_ = true;
    MessageLoop::current()->Quit();
  }

  bool was_called() const { return was_called_; }

 private:
  bool was_called_;
};


}  // namespace

// A test that makes sure we properly save the client id we were passed when
// the app called the getNotificationChannel API.
IN_PROC_BROWSER_TEST_F(AppNotificationTest, SaveClientId) {
  Interceptor interceptor;
  AppNotifyChannelSetup::SetInterceptorForTests(&interceptor);

  const Extension* app =
      LoadExtension(test_data_dir_.AppendASCII("app_notifications"));
  ASSERT_TRUE(app != NULL);

  application_launch::OpenApplication(application_launch::LaunchParams(
          browser()->profile(), app, extension_misc::LAUNCH_TAB,
          NEW_FOREGROUND_TAB));
  if (!interceptor.was_called())
    content::RunMessageLoop();
  EXPECT_TRUE(interceptor.was_called());

  ExtensionService* service = extensions::ExtensionSystem::Get(
      browser()->profile())->extension_service();
  ExtensionPrefs* prefs = service->extension_prefs();
  std::string saved_id = prefs->GetAppNotificationClientId(app->id());
  EXPECT_EQ(kExpectedClientId, saved_id);
}

}  // namespace extensions
