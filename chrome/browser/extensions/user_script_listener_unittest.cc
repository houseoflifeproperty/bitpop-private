// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "base/file_util.h"
#include "base/json/json_file_value_serializer.h"
#include "base/message_loop.h"
#include "base/threading/thread.h"
#include "chrome/browser/extensions/extension_service_unittest.h"
#include "chrome/browser/extensions/unpacked_installer.h"
#include "chrome/browser/extensions/user_script_listener.h"
#include "chrome/common/chrome_notification_types.h"
#include "chrome/common/chrome_paths.h"
#include "chrome/common/extensions/extension_file_util.h"
#include "chrome/test/base/testing_profile.h"
#include "content/public/browser/notification_service.h"
#include "content/public/browser/resource_controller.h"
#include "content/public/browser/resource_throttle.h"
#include "net/url_request/url_request.h"
#include "net/url_request/url_request_test_job.h"
#include "net/url_request/url_request_test_util.h"
#include "testing/gtest/include/gtest/gtest.h"

using content::ResourceController;
using content::ResourceThrottle;

namespace extensions {

namespace {

const char kMatchingUrl[] = "http://google.com/";
const char kNotMatchingUrl[] = "http://example.com/";
const char kTestData[] = "Hello, World!";

class ThrottleController : public base::SupportsUserData::Data,
                           public ResourceController {
 public:
  ThrottleController(net::URLRequest* request, ResourceThrottle* throttle)
      : request_(request),
        throttle_(throttle) {
    throttle_->set_controller_for_testing(this);
  }

  // ResourceController implementation:
  virtual void Resume() {
    request_->Start();
  }
  virtual void Cancel() {
    NOTREACHED();
  }
  virtual void CancelAndIgnore() {
    NOTREACHED();
  }
  virtual void CancelWithError(int error_code) {
    NOTREACHED();
  }

 private:
  net::URLRequest* request_;
  scoped_ptr<ResourceThrottle> throttle_;
};

// A simple test net::URLRequestJob. We don't care what it does, only that
// whether it starts and finishes.
class SimpleTestJob : public net::URLRequestTestJob {
 public:
  SimpleTestJob(net::URLRequest* request,
                net::NetworkDelegate* network_delegate)
      : net::URLRequestTestJob(request,
                               network_delegate,
                               test_headers(),
                               kTestData,
                               true) {}
 private:
  ~SimpleTestJob() {}
};

// Yoinked from extension_manifest_unittest.cc.
DictionaryValue* LoadManifestFile(const FilePath path, std::string* error) {
  EXPECT_TRUE(file_util::PathExists(path));
  JSONFileValueSerializer serializer(path);
  return static_cast<DictionaryValue*>(serializer.Deserialize(NULL, error));
}

scoped_refptr<Extension> LoadExtension(const std::string& filename,
                                       std::string* error) {
  FilePath path;
  PathService::Get(chrome::DIR_TEST_DATA, &path);
  path = path.
      AppendASCII("extensions").
      AppendASCII("manifest_tests").
      AppendASCII(filename.c_str());
  scoped_ptr<DictionaryValue> value(LoadManifestFile(path, error));
  if (!value.get())
    return NULL;
  return Extension::Create(path.DirName(), Extension::LOAD, *value,
                           Extension::NO_FLAGS, error);
}

}  // namespace

class UserScriptListenerTest
    : public ExtensionServiceTestBase,
      public net::URLRequest::Interceptor {
 public:
  UserScriptListenerTest() {
    net::URLRequest::Deprecated::RegisterRequestInterceptor(this);
  }

  ~UserScriptListenerTest() {
    net::URLRequest::Deprecated::UnregisterRequestInterceptor(this);
  }

  virtual void SetUp() {
    ExtensionServiceTestBase::SetUp();

    InitializeEmptyExtensionService();
    service_->Init();
    MessageLoop::current()->RunUntilIdle();

    listener_ = new UserScriptListener();
  }

  virtual void TearDown() {
    listener_ = NULL;
    MessageLoop::current()->RunUntilIdle();
  }

  // net::URLRequest::Interceptor
  virtual net::URLRequestJob* MaybeIntercept(
      net::URLRequest* request, net::NetworkDelegate* network_delegate) {
    return new SimpleTestJob(request, network_delegate);
  }

 protected:
  net::TestURLRequest* StartTestRequest(net::URLRequest::Delegate* delegate,
                                        const std::string& url_string,
                                        net::TestURLRequestContext* context) {
    GURL url(url_string);
    net::TestURLRequest* request =
        new net::TestURLRequest(url, delegate, context);

    ResourceThrottle* throttle =
        listener_->CreateResourceThrottle(url, ResourceType::MAIN_FRAME);

    bool defer = false;
    if (throttle) {
      request->SetUserData(NULL, new ThrottleController(request, throttle));

      throttle->WillStartRequest(&defer);
    }

    if (!defer)
      request->Start();

    return request;
  }

  void LoadTestExtension() {
    FilePath test_dir;
    ASSERT_TRUE(PathService::Get(chrome::DIR_TEST_DATA, &test_dir));
    FilePath extension_path = test_dir
        .AppendASCII("extensions")
        .AppendASCII("good")
        .AppendASCII("Extensions")
        .AppendASCII("behllobkkfkfnphdnhnkndlbkcpglgmj")
        .AppendASCII("1.0.0.0");
    UnpackedInstaller::Create(service_)->Load(extension_path);
  }

  void UnloadTestExtension() {
    ASSERT_FALSE(service_->extensions()->is_empty());
    service_->UnloadExtension((*service_->extensions()->begin())->id(),
                              extension_misc::UNLOAD_REASON_DISABLE);
  }

  scoped_refptr<UserScriptListener> listener_;
};

namespace {

TEST_F(UserScriptListenerTest, DelayAndUpdate) {
  LoadTestExtension();
  MessageLoop::current()->RunUntilIdle();

  net::TestDelegate delegate;
  net::TestURLRequestContext context;
  scoped_ptr<net::TestURLRequest> request(
      StartTestRequest(&delegate, kMatchingUrl, &context));
  ASSERT_FALSE(request->is_pending());

  content::NotificationService::current()->Notify(
      chrome::NOTIFICATION_USER_SCRIPTS_UPDATED,
      content::Source<Profile>(profile_.get()),
      content::NotificationService::NoDetails());
  MessageLoop::current()->RunUntilIdle();
  EXPECT_EQ(kTestData, delegate.data_received());
}

TEST_F(UserScriptListenerTest, DelayAndUnload) {
  LoadTestExtension();
  MessageLoop::current()->RunUntilIdle();

  net::TestDelegate delegate;
  net::TestURLRequestContext context;
  scoped_ptr<net::TestURLRequest> request(
      StartTestRequest(&delegate, kMatchingUrl, &context));
  ASSERT_FALSE(request->is_pending());

  UnloadTestExtension();
  MessageLoop::current()->RunUntilIdle();

  // This is still not enough to start delayed requests. We have to notify the
  // listener that the user scripts have been updated.
  ASSERT_FALSE(request->is_pending());

  content::NotificationService::current()->Notify(
      chrome::NOTIFICATION_USER_SCRIPTS_UPDATED,
      content::Source<Profile>(profile_.get()),
      content::NotificationService::NoDetails());
  MessageLoop::current()->RunUntilIdle();
  EXPECT_EQ(kTestData, delegate.data_received());
}

TEST_F(UserScriptListenerTest, NoDelayNoExtension) {
  net::TestDelegate delegate;
  net::TestURLRequestContext context;
  scoped_ptr<net::TestURLRequest> request(
      StartTestRequest(&delegate, kMatchingUrl, &context));

  // The request should be started immediately.
  ASSERT_TRUE(request->is_pending());

  MessageLoop::current()->RunUntilIdle();
  EXPECT_EQ(kTestData, delegate.data_received());
}

TEST_F(UserScriptListenerTest, NoDelayNotMatching) {
  LoadTestExtension();
  MessageLoop::current()->RunUntilIdle();

  net::TestDelegate delegate;
  net::TestURLRequestContext context;
  scoped_ptr<net::TestURLRequest> request(StartTestRequest(&delegate,
                                                           kNotMatchingUrl,
                                                           &context));

  // The request should be started immediately.
  ASSERT_TRUE(request->is_pending());

  MessageLoop::current()->RunUntilIdle();
  EXPECT_EQ(kTestData, delegate.data_received());
}

TEST_F(UserScriptListenerTest, MultiProfile) {
  LoadTestExtension();
  MessageLoop::current()->RunUntilIdle();

  // Fire up a second profile and have it load and extension with a content
  // script.
  TestingProfile profile2;
  std::string error;
  scoped_refptr<Extension> extension = LoadExtension(
      "content_script_yahoo.json", &error);
  ASSERT_TRUE(extension.get());

  content::NotificationService::current()->Notify(
      chrome::NOTIFICATION_EXTENSION_LOADED,
      content::Source<Profile>(&profile2),
      content::Details<Extension>(extension.get()));

  net::TestDelegate delegate;
  net::TestURLRequestContext context;
  scoped_ptr<net::TestURLRequest> request(
      StartTestRequest(&delegate, kMatchingUrl, &context));
  ASSERT_FALSE(request->is_pending());

  // When the first profile's user scripts are ready, the request should still
  // be blocked waiting for profile2.
  content::NotificationService::current()->Notify(
      chrome::NOTIFICATION_USER_SCRIPTS_UPDATED,
      content::Source<Profile>(profile_.get()),
      content::NotificationService::NoDetails());
  MessageLoop::current()->RunUntilIdle();
  ASSERT_FALSE(request->is_pending());
  EXPECT_TRUE(delegate.data_received().empty());

  // After profile2 is ready, the request should proceed.
  content::NotificationService::current()->Notify(
      chrome::NOTIFICATION_USER_SCRIPTS_UPDATED,
      content::Source<Profile>(&profile2),
      content::NotificationService::NoDetails());
  MessageLoop::current()->RunUntilIdle();
  EXPECT_EQ(kTestData, delegate.data_received());
}

// Test when the script updated notification occurs before the throttle's
// WillStartRequest function is called.  This can occur when there are multiple
// throttles.
TEST_F(UserScriptListenerTest, ResumeBeforeStart) {
  LoadTestExtension();
  MessageLoop::current()->RunUntilIdle();
  net::TestDelegate delegate;
  net::TestURLRequestContext context;
  GURL url(kMatchingUrl);
  scoped_ptr<net::TestURLRequest> request(
      new net::TestURLRequest(url, &delegate, &context));

  ResourceThrottle* throttle =
      listener_->CreateResourceThrottle(url, ResourceType::MAIN_FRAME);
  ASSERT_TRUE(throttle);
  request->SetUserData(NULL, new ThrottleController(request.get(), throttle));

  ASSERT_FALSE(request->is_pending());

  content::NotificationService::current()->Notify(
      chrome::NOTIFICATION_USER_SCRIPTS_UPDATED,
      content::Source<Profile>(profile_.get()),
      content::NotificationService::NoDetails());
  MessageLoop::current()->RunUntilIdle();

  bool defer = false;
  throttle->WillStartRequest(&defer);
  ASSERT_FALSE(defer);
}

}  // namespace

}  // namespace extensions
