// Copyright (c) 2013 House of Life Property Ltd. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef CHROME_BROWSER_UI_VIEWS_BITTORRENT_SURF_BUTTON_BUBBLE_H_
#define CHROME_BROWSER_UI_VIEWS_BITTORRENT_SURF_BUTTON_BUBBLE_H_

#include "ui/views/bubble/bubble_delegate.h"

class Browser;

class BitTorrentSurfButtonBubble : public views::BubbleDelegateView {
 public:
  // |browser| is the opening browser and is NULL in unittests.
  static BitTorrentSurfButtonBubble* ShowBubble(Browser* browser, views::View* anchor_view);
  virtual void OnWidgetActivationChanged(views::Widget* widget, bool active) OVERRIDE;

 protected:
  // views::BubbleDelegateView overrides:
  virtual void Init() OVERRIDE;

 private:
  BitTorrentSurfButtonBubble(Browser* browser, views::View* anchor_view);
  virtual ~BitTorrentSurfButtonBubble();

  Browser* browser_;

  DISALLOW_COPY_AND_ASSIGN(BitTorrentSurfButtonBubble);
};

#endif  // CHROME_BROWSER_UI_VIEWS_BITTORRENT_SURF_BUTTON_BUBBLE_H_
