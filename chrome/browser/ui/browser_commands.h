// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef CHROME_BROWSER_UI_BROWSER_COMMANDS_H_
#define CHROME_BROWSER_UI_BROWSER_COMMANDS_H_

#include <string>

#include "chrome/browser/debugger/devtools_toggle_action.h"
#include "chrome/browser/ui/host_desktop.h"
#include "content/public/common/page_zoom.h"
#include "webkit/glue/window_open_disposition.h"

class Browser;
class CommandObserver;
class GURL;
class Profile;

namespace content {
class WebContents;
struct SSLStatus;
}

namespace chrome {

// For all commands, where a tab is not specified, the active tab is assumed.

bool IsCommandEnabled(Browser* browser, int command);
bool SupportsCommand(Browser* browser, int command);
bool ExecuteCommand(Browser* browser, int command);
bool ExecuteCommandWithDisposition(Browser* browser,
                                   int command,
                                   WindowOpenDisposition disposition);
void UpdateCommandEnabled(Browser* browser, int command, bool enabled);
void AddCommandObserver(Browser*, int command, CommandObserver* observer);
void RemoveCommandObserver(Browser*, int command, CommandObserver* observer);

int GetContentRestrictions(const Browser* browser);

// Opens a new window with the default blank tab.
void NewEmptyWindow(Profile* profile);
void NewEmptyWindow(Profile* profile, HostDesktopType desktop_type);

// Opens a new window with the default blank tab. This bypasses metrics and
// various internal bookkeeping; NewEmptyWindow (above) is preferred.
Browser* OpenEmptyWindow(Profile* profile);
Browser* OpenEmptyWindow(Profile* profile, HostDesktopType desktop_type);

// Opens a new window with the tabs from |profile|'s TabRestoreService.
void OpenWindowWithRestoredTabs(Profile* profile);

// Opens the specified URL in a new browser window in an incognito session on
// the desktop specified by |desktop_type|. If there is already an existing
// active incognito session for the specified |profile|, that session is re-
// used.
void OpenURLOffTheRecord(Profile* profile, const GURL& url,
                         chrome::HostDesktopType desktop_type);

bool CanGoBack(const Browser* browser);
void GoBack(Browser* browser, WindowOpenDisposition disposition);
bool CanGoForward(const Browser* browser);
void GoForward(Browser* browser, WindowOpenDisposition disposition);
bool NavigateToIndexWithDisposition(Browser* browser,
                                    int index,
                                    WindowOpenDisposition disp);
void Reload(Browser* browser, WindowOpenDisposition disposition);
void ReloadIgnoringCache(Browser* browser, WindowOpenDisposition disposition);
bool CanReload(const Browser* browser);
void Home(Browser* browser, WindowOpenDisposition disposition);
void OpenCurrentURL(Browser* browser);
void Stop(Browser* browser);
void NewWindow(Browser* browser);
void NewIncognitoWindow(Browser* browser);
void CloseWindow(Browser* browser);
void NewTab(Browser* browser);
void CloseTab(Browser* browser);
void RestoreTab(Browser* browser);
bool CanRestoreTab(const Browser* browser);
void SelectNextTab(Browser* browser);
void SelectPreviousTab(Browser* browser);
void OpenTabpose(Browser* browser);  // Mac-only
void MoveTabNext(Browser* browser);
void MoveTabPrevious(Browser* browser);
void SelectNumberedTab(Browser* browser, int index);
void SelectLastTab(Browser* browser);
void DuplicateTab(Browser* browser);
bool CanDuplicateTab(const Browser* browser);
content::WebContents* DuplicateTabAt(Browser* browser, int index);
bool CanDuplicateTabAt(Browser* browser, int index);
void ConvertPopupToTabbedBrowser(Browser* browser);
void Exit();
void BookmarkCurrentPage(Browser* browser);
void BookmarkCurrentPageFromStar(Browser* browser);
bool CanBookmarkCurrentPage(const Browser* browser);
void BookmarkAllTabs(Browser* browser);
bool CanBookmarkAllTabs(const Browser* browser);
void TogglePagePinnedToStartScreen(Browser* browser);
void SavePage(Browser* browser);
bool CanSavePage(const Browser* browser);
void ShowFindBar(Browser* browser);
void ShowPageInfo(Browser* browser,
                  content::WebContents* web_contents,
                  const GURL& url,
                  const content::SSLStatus& ssl,
                  bool show_history);
void ShowChromeToMobileBubble(Browser* browser);
void Print(Browser* browser);
bool CanPrint(const Browser* browser);
void AdvancedPrint(Browser* browser);
bool CanAdvancedPrint(const Browser* browser);
void PrintToDestination(Browser* browser);
void EmailPageLocation(Browser* browser);
bool CanEmailPageLocation(const Browser* browser);
void Cut(Browser* browser);
void Copy(Browser* browser);
void Paste(Browser* browser);
void Find(Browser* browser);
void FindNext(Browser* browser);
void FindPrevious(Browser* browser);
void FindInPage(Browser* browser, bool find_next, bool forward_direction);
void Zoom(Browser* browser, content::PageZoom zoom);
void FocusToolbar(Browser* browser);
void FocusLocationBar(Browser* browser);
void FocusSearch(Browser* browser);
void FocusAppMenu(Browser* browser);
void FocusBookmarksToolbar(Browser* browser);
void FocusNextPane(Browser* browser);
void FocusPreviousPane(Browser* browser);
void ToggleDevToolsWindow(Browser* browser, DevToolsToggleAction action);
bool CanOpenTaskManager();
void OpenTaskManager(Browser* browser, bool highlight_background_resources);
void OpenFeedbackDialog(Browser* browser);
void ToggleBookmarkBar(Browser* browser);
void ShowAppMenu(Browser* browser);
void ShowAvatarMenu(Browser* browser);
void OpenUpdateChromeDialog(Browser* browser);
void ToggleSpeechInput(Browser* browser);
bool CanRequestTabletSite(content::WebContents* current_tab);
bool IsRequestingTabletSite(Browser* browser);
void ToggleRequestTabletSite(Browser* browser);
void ToggleFullscreenMode(Browser* browser);
void ClearCache(Browser* browser);
bool IsDebuggerAttachedToCurrentTab(Browser* browser);

// Opens a view-source tab for a given web contents.
void ViewSource(Browser* browser, content::WebContents* tab);

// Opens a view-source tab for any frame within a given web contents.
void ViewSource(Browser* browser,
                content::WebContents* tab,
                const GURL& url,
                const std::string& content_state);

void ViewSelectedSource(Browser* browser);
bool CanViewSource(const Browser* browser);

void CreateApplicationShortcuts(Browser* browser);
bool CanCreateApplicationShortcuts(const Browser* browser);

void ConvertTabToAppWindow(Browser* browser, content::WebContents* contents);

}  // namespace chrome

#endif  // CHROME_BROWSER_UI_BROWSER_COMMANDS_H_
