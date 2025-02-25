// Copyright (c) 2011 House of Life Property Ltd. All rights reserved.
// Copyright (c) 2011 Crystalnix <vgachkaylo@crystalnix.com>
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef CHROME_BROWSER_UI_COCOA_FACEBOOK_CHATBAR_CONTROLLER_H_
#define CHROME_BROWSER_UI_COCOA_FACEBOOK_CHATBAR_CONTROLLER_H_
#pragma once

#import <Foundation/Foundation.h>

#import "base/mac/cocoa_protocols.h"
#include "base/memory/scoped_nsobject.h"
#include "base/memory/scoped_ptr.h"
#import "chrome/browser/ui/cocoa/view_resizer.h"

@class HoverButton;
class FacebookChatbar;
class Browser;
class FacebookChatItem;
@class FacebookChatItemController;

@interface FacebookChatbarController : NSViewController<NSAnimationDelegate> {
 @private
  IBOutlet HoverButton *hoverCloseButton_;

  BOOL barIsVisible_;

  BOOL isFullscreen_;

  scoped_ptr<FacebookChatbar> bridge_;

  // Height of the shelf when it's fully visible.
  CGFloat maxBarHeight_;

  // The download items we have added to our shelf.
  scoped_nsobject<NSMutableArray> chatItemControllers_;

  // Delegate that handles resizing our view.
  id<ViewResizer> resizeDelegate_;

  scoped_nsobject<NSAnimation> addAnimation_;
  scoped_nsobject<NSAnimation> removeAnimation_;
  scoped_nsobject<NSAnimation> placeFirstAnimation_;

  FacebookChatItemController *lastAddedItem_;

  BOOL isRemovingAll_;

  Browser* browser_;
}

- (id)initWithBrowser:(Browser*)browser
       resizeDelegate:(id<ViewResizer>)resizeDelegate;

- (IBAction)show:(id)sender;
- (IBAction)hide:(id)sender;

- (FacebookChatbar*)bridge;

- (BOOL)isVisible;

- (void)addChatItem:(FacebookChatItem*)item;
- (void)activateItem:(FacebookChatItemController*)chatItem;
- (void)remove:(FacebookChatItemController*)chatItem;
- (void)removeAll;
- (void)placeFirstInOrder:(FacebookChatItemController*)chatItem;

- (void)layoutItems;

- (void)viewFrameDidChange:(NSNotification*)notification;

- (void)layoutItemsChildWindows;
- (void)closeAllChildrenPopups;
@end

#endif  // CHROME_BROWSER_UI_COCOA_FACEBOOK_CHATBAR_CONTROLLER_H_
