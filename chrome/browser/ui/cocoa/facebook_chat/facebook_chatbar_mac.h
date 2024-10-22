// Copyright (c) 2011 House of Life Property Ltd. All rights reserved.
// Copyright (c) 2011 Crystalnix <vgachkaylo@crystalnix.com>
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef CHROME_BROWSER_UI_COCOA_FACEBOOK_CHATBAR_MAC_H_
#define CHROME_BROWSER_UI_COCOA_FACEBOOK_CHATBAR_MAC_H_
#pragma once

#import <Cocoa/Cocoa.h>

#include "base/compiler_specific.h"
#include "chrome/browser/facebook_chat/facebook_chatbar.h"
#include "chrome/browser/facebook_chat/facebook_chat_manager.h"

@class FacebookChatbarController;
class Browser;

class FacebookChatbarMac : public FacebookChatbar {
  public:
    explicit FacebookChatbarMac(Browser *browser,
                                FacebookChatbarController *controller);
    virtual void AddChatItem(FacebookChatItem *chat_item) OVERRIDE;
    virtual void RemoveAll() OVERRIDE;

    virtual void Show() OVERRIDE;
    virtual void Hide() OVERRIDE;

    virtual Browser *browser() const OVERRIDE;

  private:
    Browser *browser_;

    FacebookChatbarController *controller_;
};

#endif  // CHROME_BROWSER_UI_COCOA_FACEBOOK_CHATBAR_MAC_H_

