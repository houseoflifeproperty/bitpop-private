// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "chrome/browser/extensions/extension_browsertest.h"
#include "chrome/browser/ui/browser.h"
#include "chrome/browser/ui/browser_tabstrip.h"
#include "chrome/common/extensions/extension.h"
#include "chrome/common/url_constants.h"
#include "chrome/test/base/ui_test_utils.h"
#include "content/public/browser/web_contents.h"
#include "content/public/test/browser_test_utils.h"
#include "extensions/common/constants.h"

using content::WebContents;
using extensions::Extension;

namespace {

const std::string kSubscribePage = "/subscribe.html";
const std::string kFeedPageMultiRel = "files/feeds/feed_multi_rel.html";
const std::string kValidFeedNoLinks = "files/feeds/feed_nolinks.xml";
const std::string kValidFeed0 = "files/feeds/feed_script.xml";
const std::string kValidFeed1 = "files/feeds/feed1.xml";
const std::string kValidFeed2 = "files/feeds/feed2.xml";
const std::string kValidFeed3 = "files/feeds/feed3.xml";
const std::string kValidFeed4 = "files/feeds/feed4.xml";
const std::string kValidFeed5 = "files/feeds/feed5.xml";
const std::string kValidFeed6 = "files/feeds/feed6.xml";
const std::string kInvalidFeed1 = "files/feeds/feed_invalid1.xml";
const std::string kInvalidFeed2 = "files/feeds/feed_invalid2.xml";
// We need a triple encoded string to prove that we are not decoding twice in
// subscribe.js because one layer is also stripped off when subscribe.js passes
// it to the XMLHttpRequest object.
const std::string kFeedTripleEncoded = "files/feeds/url%25255Fdecoding.html";

static const wchar_t* jscript_feed_title =
    L"window.domAutomationController.send("
    L"  document.getElementById('title') ? "
    L"    document.getElementById('title').textContent : "
    L"    \"element 'title' not found\""
    L");";
static const wchar_t* jscript_anchor =
    L"window.domAutomationController.send("
    L"  document.getElementById('anchor_0') ? "
    L"    document.getElementById('anchor_0').textContent : "
    L"    \"element 'anchor_0' not found\""
    L");";
static const wchar_t* jscript_desc =
    L"window.domAutomationController.send("
    L"  document.getElementById('desc_0') ? "
    L"    document.getElementById('desc_0').textContent : "
    L"    \"element 'desc_0' not found\""
    L");";
static const wchar_t* jscript_error =
    L"window.domAutomationController.send("
    L"  document.getElementById('error') ? "
    L"    document.getElementById('error').textContent : "
    L"    \"No error\""
    L");";

GURL GetFeedUrl(net::TestServer* server, const std::string& feed_page,
                bool direct_url, std::string extension_id) {
  GURL feed_url = server->GetURL(feed_page);
  if (direct_url) {
    // We navigate directly to the subscribe page for feeds where the feed
    // sniffing won't work, in other words, as is the case for malformed feeds.
    return GURL(std::string(extensions::kExtensionScheme) +
        content::kStandardSchemeSeparator +
        extension_id + std::string(kSubscribePage) + std::string("?") +
        feed_url.spec() + std::string("&synchronous"));
  } else {
    // Navigate to the feed content (which will cause the extension to try to
    // sniff the type and display the subscribe page in another tab.
    return GURL(feed_url.spec());
  }
}

bool ValidatePageElement(WebContents* tab,
                         const std::wstring& frame,
                         const std::wstring& javascript,
                         const std::string& expected_value) {
  std::string returned_value;
  std::string error;

  if (!content::ExecuteJavaScriptAndExtractString(
          tab->GetRenderViewHost(),
          frame,
          javascript, &returned_value))
    return false;

  EXPECT_STREQ(expected_value.c_str(), returned_value.c_str());
  return expected_value == returned_value;
}

// Navigates to a feed page and, if |sniff_xml_type| is set, wait for the
// extension to kick in, detect the feed and redirect to a feed preview page.
// |sniff_xml_type| is generally set to true if the feed is sniffable and false
// for invalid feeds.
void NavigateToFeedAndValidate(net::TestServer* server,
                               const std::string& url,
                               Browser* browser,
                               std::string extension_id,
                               bool sniff_xml_type,
                               const std::string& expected_feed_title,
                               const std::string& expected_item_title,
                               const std::string& expected_item_desc,
                               const std::string& expected_error) {
  if (sniff_xml_type) {
    // TODO(finnur): Implement this is a non-flaky way.
  }

  // Navigate to the subscribe page directly.
  ui_test_utils::NavigateToURL(browser,
                               GetFeedUrl(server, url, true, extension_id));

  WebContents* tab = chrome::GetActiveWebContents(browser);
  ASSERT_TRUE(ValidatePageElement(tab,
                                  L"",
                                  jscript_feed_title,
                                  expected_feed_title));
  ASSERT_TRUE(ValidatePageElement(tab,
                                  L"//html/body/div/iframe[1]",
                                  jscript_anchor,
                                  expected_item_title));
  ASSERT_TRUE(ValidatePageElement(tab,
                                  L"//html/body/div/iframe[1]",
                                  jscript_desc,
                                  expected_item_desc));
  ASSERT_TRUE(ValidatePageElement(tab,
                                  L"//html/body/div/iframe[1]",
                                  jscript_error,
                                  expected_error));
}

} // namespace

// Makes sure that the RSS detects RSS feed links, even when rel tag contains
// more than just "alternate".
IN_PROC_BROWSER_TEST_F(ExtensionBrowserTest, RSSMultiRelLink) {
  ASSERT_TRUE(test_server()->Start());

  ASSERT_TRUE(LoadExtension(
    test_data_dir_.AppendASCII("subscribe_page_action")));

  ASSERT_TRUE(WaitForPageActionVisibilityChangeTo(0));

  // Navigate to the feed page.
  GURL feed_url = test_server()->GetURL(kFeedPageMultiRel);
  ui_test_utils::NavigateToURL(browser(), feed_url);
  // We should now have one page action ready to go in the LocationBar.
  ASSERT_TRUE(WaitForPageActionVisibilityChangeTo(1));
}

IN_PROC_BROWSER_TEST_F(ExtensionBrowserTest, ParseFeedValidFeed1) {
  ASSERT_TRUE(test_server()->Start());

  const Extension* extension = LoadExtension(
      test_data_dir_.AppendASCII("subscribe_page_action"));
  ASSERT_TRUE(extension);
  std::string id = extension->id();

  NavigateToFeedAndValidate(test_server(), kValidFeed1, browser(), id, true,
                            "Feed for MyFeedTitle",
                            "Title 1",
                            "Desc",
                            "No error");
}

IN_PROC_BROWSER_TEST_F(ExtensionBrowserTest, ParseFeedValidFeed2) {
  ASSERT_TRUE(test_server()->Start());

  const Extension* extension = LoadExtension(
      test_data_dir_.AppendASCII("subscribe_page_action"));
  ASSERT_TRUE(extension);
  std::string id = extension->id();

  NavigateToFeedAndValidate(test_server(), kValidFeed2, browser(), id, true,
                            "Feed for MyFeed2",
                            "My item title1",
                            "This is a summary.",
                            "No error");
}

IN_PROC_BROWSER_TEST_F(ExtensionBrowserTest, ParseFeedValidFeed3) {
  ASSERT_TRUE(test_server()->Start());

  const Extension* extension = LoadExtension(
      test_data_dir_.AppendASCII("subscribe_page_action"));
  ASSERT_TRUE(extension);
  std::string id = extension->id();

  NavigateToFeedAndValidate(test_server(), kValidFeed3, browser(), id, true,
                            "Feed for Google Code buglist rss feed",
                            "My dear title",
                            "My dear content",
                            "No error");
}

IN_PROC_BROWSER_TEST_F(ExtensionBrowserTest, ParseFeedValidFeed4) {
  ASSERT_TRUE(test_server()->Start());

  const Extension* extension = LoadExtension(
      test_data_dir_.AppendASCII("subscribe_page_action"));
  ASSERT_TRUE(extension);
  std::string id = extension->id();

  NavigateToFeedAndValidate(test_server(), kValidFeed4, browser(), id, true,
                            "Feed for Title chars <script> %23 stop",
                            "Title chars  %23 stop",
                            "My dear content %23 stop",
                            "No error");
}

IN_PROC_BROWSER_TEST_F(ExtensionBrowserTest, ParseFeedValidFeed0) {
  ASSERT_TRUE(test_server()->Start());

  const Extension* extension = LoadExtension(
      test_data_dir_.AppendASCII("subscribe_page_action"));
  ASSERT_TRUE(extension);
  std::string id = extension->id();

  // Try a feed with a link with an onclick handler (before r27440 this would
  // trigger a NOTREACHED).
  NavigateToFeedAndValidate(test_server(), kValidFeed0, browser(), id, true,
                            "Feed for MyFeedTitle",
                            "Title 1",
                            "Desc VIDEO",
                            "No error");
}

IN_PROC_BROWSER_TEST_F(ExtensionBrowserTest, ParseFeedValidFeed5) {
  ASSERT_TRUE(test_server()->Start());

  const Extension* extension = LoadExtension(
      test_data_dir_.AppendASCII("subscribe_page_action"));
  ASSERT_TRUE(extension);
  std::string id = extension->id();

  // Feed with valid but mostly empty xml.
  NavigateToFeedAndValidate(test_server(), kValidFeed5, browser(), id, true,
                            "Feed for Unknown feed name",
                            "element 'anchor_0' not found",
                            "element 'desc_0' not found",
                            "This feed contains no entries.");
}

IN_PROC_BROWSER_TEST_F(ExtensionBrowserTest, ParseFeedValidFeed6) {
  ASSERT_TRUE(test_server()->Start());

  const Extension* extension = LoadExtension(
      test_data_dir_.AppendASCII("subscribe_page_action"));
  ASSERT_TRUE(extension);
  std::string id = extension->id();

  // Feed that is technically invalid but still parseable.
  NavigateToFeedAndValidate(test_server(), kValidFeed6, browser(), id, true,
                            "Feed for MyFeedTitle",
                            "Title 1",
                            "Desc",
                            "No error");
}

IN_PROC_BROWSER_TEST_F(ExtensionBrowserTest, ParseFeedInvalidFeed1) {
  ASSERT_TRUE(test_server()->Start());

  const Extension* extension = LoadExtension(
      test_data_dir_.AppendASCII("subscribe_page_action"));
  ASSERT_TRUE(extension);
  std::string id = extension->id();

  // Try an empty feed.
  NavigateToFeedAndValidate(test_server(), kInvalidFeed1, browser(), id, false,
                            "Feed for Unknown feed name",
                            "element 'anchor_0' not found",
                            "element 'desc_0' not found",
                            "This feed contains no entries.");
}

IN_PROC_BROWSER_TEST_F(ExtensionBrowserTest, ParseFeedInvalidFeed2) {
  ASSERT_TRUE(test_server()->Start());

  const Extension* extension = LoadExtension(
      test_data_dir_.AppendASCII("subscribe_page_action"));
  ASSERT_TRUE(extension);
  std::string id = extension->id();

  // Try a garbage feed.
  NavigateToFeedAndValidate(test_server(), kInvalidFeed2, browser(), id, false,
                            "Feed for Unknown feed name",
                            "element 'anchor_0' not found",
                            "element 'desc_0' not found",
                            "This feed contains no entries.");
}

IN_PROC_BROWSER_TEST_F(ExtensionBrowserTest, ParseFeedInvalidFeed3) {
  ASSERT_TRUE(test_server()->Start());

  const Extension* extension = LoadExtension(
      test_data_dir_.AppendASCII("subscribe_page_action"));
  ASSERT_TRUE(extension);
  std::string id = extension->id();

  // Try a feed that doesn't exist.
  NavigateToFeedAndValidate(test_server(), "foo.xml", browser(), id, false,
                            "Feed for Unknown feed name",
                            "element 'anchor_0' not found",
                            "element 'desc_0' not found",
                            "This feed contains no entries.");
}

IN_PROC_BROWSER_TEST_F(ExtensionBrowserTest, ParseFeedInvalidFeed4) {
  ASSERT_TRUE(test_server()->Start());

  const Extension* extension = LoadExtension(
      test_data_dir_.AppendASCII("subscribe_page_action"));
  ASSERT_TRUE(extension);
  std::string id = extension->id();

  // subscribe.js shouldn't double-decode the URL passed in. Otherwise feed
  // links such as http://search.twitter.com/search.atom?lang=en&q=%23chrome
  // will result in no feed being downloaded because %23 gets decoded to # and
  // therefore #chrome is not treated as part of the Twitter query. This test
  // uses an underscore instead of a hash, but the principle is the same. If
  // we start erroneously double decoding again, the path (and the feed) will
  // become valid resulting in a failure for this test.
  NavigateToFeedAndValidate(
      test_server(), kFeedTripleEncoded, browser(), id, true,
      "Feed for Unknown feed name",
      "element 'anchor_0' not found",
      "element 'desc_0' not found",
      "This feed contains no entries.");
}

IN_PROC_BROWSER_TEST_F(ExtensionBrowserTest, ParseFeedValidFeedNoLinks) {
  ASSERT_TRUE(test_server()->Start());

  const Extension* extension = LoadExtension(
      test_data_dir_.AppendASCII("subscribe_page_action"));
  ASSERT_TRUE(extension);
  std::string id = extension->id();

  // Valid feed but containing no links.
  NavigateToFeedAndValidate(
      test_server(), kValidFeedNoLinks, browser(), id, true,
      "Feed for MyFeedTitle",
      "Title with no link",
      "Desc",
      "No error");
}
