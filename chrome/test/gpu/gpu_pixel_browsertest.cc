// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "base/command_line.h"
#include "base/file_path.h"
#include "base/file_util.h"
#include "base/path_service.h"
#include "base/string_number_conversions.h"
#include "base/string_util.h"
#include "base/stringprintf.h"
#include "chrome/browser/ui/browser.h"
#include "chrome/browser/ui/browser_tabstrip.h"
#include "chrome/browser/ui/browser_window.h"
#include "chrome/browser/ui/window_snapshot/window_snapshot.h"
#include "chrome/common/chrome_paths.h"
#include "chrome/common/chrome_switches.h"
#include "chrome/common/chrome_version_info.h"
#include "chrome/test/base/in_process_browser_test.h"
#include "chrome/test/base/test_launcher_utils.h"
#include "chrome/test/base/tracing.h"
#include "chrome/test/base/ui_test_utils.h"
#include "content/public/browser/render_view_host.h"
#include "content/public/browser/web_contents.h"
#include "content/public/common/content_switches.h"
#include "content/public/test/browser_test_utils.h"
#include "googleurl/src/gurl.h"
#include "net/base/net_util.h"
#include "testing/gtest/include/gtest/gtest.h"
#include "third_party/skia/include/core/SkBitmap.h"
#include "third_party/skia/include/core/SkColor.h"
#include "ui/compositor/compositor_setup.h"
#include "ui/gfx/codec/png_codec.h"
#include "ui/gfx/size.h"
#include "ui/gl/gl_switches.h"

namespace {

enum ReferenceImageOption {
  kReferenceImageLocal,
  kReferenceImageCheckedIn,
  kReferenceImageNone  // Only check a few key pixels.
};

struct ReferencePixel {
  int x, y;
  unsigned char r, g, b;
};

// Command line flag for overriding the default location for putting generated
// test images that do not match references.
const char kGeneratedDir[] = "generated-dir";
// Command line flag for overriding the default location for reference images.
const char kReferenceDir[] = "reference-dir";

// Corner shadow size.
const int kCornerDecorationSize = 15;
// Side shadow size.
const int kSideDecorationSize = 2;

// Reads and decodes a PNG image to a bitmap. Returns true on success. The PNG
// should have been encoded using |gfx::PNGCodec::Encode|.
bool ReadPNGFile(const FilePath& file_path, SkBitmap* bitmap) {
  DCHECK(bitmap);
  std::string png_data;
  return file_util::ReadFileToString(file_path, &png_data) &&
         gfx::PNGCodec::Decode(reinterpret_cast<unsigned char*>(&png_data[0]),
                               png_data.length(),
                               bitmap);
}

// Encodes a bitmap into a PNG and write to disk. Returns true on success. The
// parent directory does not have to exist.
bool WritePNGFile(const SkBitmap& bitmap, const FilePath& file_path) {
  std::vector<unsigned char> png_data;
  if (gfx::PNGCodec::EncodeBGRASkBitmap(bitmap, true, &png_data) &&
      file_util::CreateDirectory(file_path.DirName())) {
    int bytes_written = file_util::WriteFile(
        file_path, reinterpret_cast<char*>(&png_data[0]), png_data.size());
    if (bytes_written == static_cast<int>(png_data.size()))
      return true;
  }
  return false;
}

// Write an empty file, whose name indicates the chrome revision when the ref
// image was generated.
bool WriteREVFile(const FilePath& file_path) {
  if (file_util::CreateDirectory(file_path.DirName())) {
    char one_byte = 0;
    int bytes_written = file_util::WriteFile(file_path, &one_byte, 1);
    if (bytes_written == 1)
      return true;
  }
  return false;
}

}  // namespace

// Test fixture for GPU image comparison tests.
// TODO(kkania): Document how to add to/modify these tests.
class GpuPixelBrowserTest : public InProcessBrowserTest {
 public:
  GpuPixelBrowserTest()
      : ref_img_revision_(0),
        ref_img_revision_no_older_than_(0),
        ref_img_option_(kReferenceImageNone) {
  }

  virtual void SetUpCommandLine(CommandLine* command_line) {
    command_line->AppendSwitchASCII(switches::kTestGLLib,
                                    "libllvmpipe.so");
  }

  virtual void SetUpInProcessBrowserTestFixture() {
    InProcessBrowserTest::SetUpInProcessBrowserTestFixture();

    CommandLine* command_line = CommandLine::ForCurrentProcess();
    if (command_line->HasSwitch(switches::kUseGpuInTests))
      ref_img_option_ = kReferenceImageLocal;

    ASSERT_TRUE(PathService::Get(chrome::DIR_TEST_DATA, &test_data_dir_));
    test_data_dir_ = test_data_dir_.AppendASCII("gpu");

    if (command_line->HasSwitch(kGeneratedDir))
      generated_img_dir_ = command_line->GetSwitchValuePath(kGeneratedDir);
    else
      generated_img_dir_ = test_data_dir_.AppendASCII("generated");

    switch (ref_img_option_) {
      case kReferenceImageLocal:
        if (command_line->HasSwitch(kReferenceDir))
          ref_img_dir_ = command_line->GetSwitchValuePath(kReferenceDir);
        else
          ref_img_dir_ = test_data_dir_.AppendASCII("gpu_reference");
        break;
      case kReferenceImageCheckedIn:
        ref_img_dir_ = test_data_dir_.AppendASCII("llvmpipe_reference");
        break;
      default:
        break;
    }

    test_name_ = testing::UnitTest::GetInstance()->current_test_info()->name();
    const char* test_status_prefixes[] = {"DISABLED_", "FLAKY_", "FAILS_"};
    for (size_t i = 0; i < arraysize(test_status_prefixes); ++i) {
      ReplaceFirstSubstringAfterOffset(
          &test_name_, 0, test_status_prefixes[i], "");
    }

    ui::DisableTestCompositor();
  }

  // If the existing ref image was saved from an revision older than the
  // ref_img_update_revision, refresh the ref image.
  void RunPixelTest(const gfx::Size& tab_container_size,
                    const FilePath& url,
                    int64 ref_img_update_revision,
                    const ReferencePixel* ref_pixels,
                    size_t ref_pixel_count) {
    if (ref_img_option_ == kReferenceImageLocal) {
      ref_img_revision_no_older_than_ = ref_img_update_revision;
      ObtainLocalRefImageRevision();
    }

#if defined(OS_WIN)
    ASSERT_TRUE(tracing::BeginTracing("-test_*"));
#endif

    browser()->window()->Activate();

    content::DOMMessageQueue message_queue;
    ui_test_utils::NavigateToURL(browser(), net::FilePathToFileURL(url));

    // Wait for notification that page is loaded.
    ASSERT_TRUE(message_queue.WaitForMessage(NULL));
    message_queue.ClearQueue();

    gfx::Rect new_bounds = GetNewTabContainerBounds(tab_container_size);

    std::wostringstream js_call;
    js_call << "preCallResizeInChromium(";
    js_call << new_bounds.width() << ", " << new_bounds.height();
    js_call << ");";

    ASSERT_TRUE(content::ExecuteJavaScript(
        chrome::GetActiveWebContents(browser())->GetRenderViewHost(),
        L"", js_call.str()));

    std::string message;
    ASSERT_TRUE(message_queue.WaitForMessage(&message));
    message_queue.ClearQueue();
    browser()->window()->SetBounds(new_bounds);

    // Wait for message from test page indicating the rendering is done.
    while (message.compare("\"resized\"")) {
      ASSERT_TRUE(message_queue.WaitForMessage(&message));
      message_queue.ClearQueue();
    }

    bool ignore_bottom_corners = false;
#if defined(OS_MACOSX)
    // On Mac Lion, bottom corners have shadows with random pixels.
    ignore_bottom_corners = true;
#endif

    SkBitmap bitmap;
    ASSERT_TRUE(TabSnapShotToImage(&bitmap));
    bool same_pixels = true;
    if (ref_img_option_ == kReferenceImageNone && ref_pixels && ref_pixel_count)
      same_pixels = ComparePixels(bitmap, ref_pixels, ref_pixel_count);
    else
      same_pixels = CompareImages(bitmap, ignore_bottom_corners);
    EXPECT_TRUE(same_pixels);

#if defined(OS_WIN)
    // For debugging the flaky test, this prints out a trace of what happened on
    // failure.
    std::string trace_events;
    ASSERT_TRUE(tracing::EndTracing(&trace_events));
    if (!same_pixels)
      fprintf(stderr, "\n\nTRACE JSON:\n\n%s\n\n", trace_events.c_str());
#endif
  }

  const FilePath& test_data_dir() const {
    return test_data_dir_;
  }

 private:
  FilePath test_data_dir_;
  FilePath generated_img_dir_;
  FilePath ref_img_dir_;
  int64 ref_img_revision_;
  // The name of the test, with any special prefixes dropped.
  std::string test_name_;

  // Any local ref image generated from older revision is ignored.
  int64 ref_img_revision_no_older_than_;

  // Whether use locally generated ref images, or checked in ref images, or
  // simply check a few key pixels.
  ReferenceImageOption ref_img_option_;

  // Compares the generated bitmap with the appropriate reference image on disk.
  // Returns true iff the images were the same.
  //
  // If no valid reference image exists, save the generated bitmap to the disk.
  // The image format is:
  //     <test_name>_<revision>.png
  // E.g.,
  //     WebGLTeapot_19762.png
  // The number is the chromium revision that generated the image.
  //
  // On failure or on ref image generation, the image and diff image will be
  // written to disk. The formats are:
  //     FAIL_<ref_image_name>, DIFF_<ref_image_name>
  // E.g.,
  //     FAIL_WebGLTeapot_19762.png, DIFF_WebGLTeapot_19762.png
  bool CompareImages(const SkBitmap& gen_bmp, bool skip_bottom_corners) {
    SkBitmap ref_bmp_on_disk;

    FilePath img_path = ref_img_dir_.AppendASCII(test_name_ + ".png");
    bool found_ref_img = ReadPNGFile(img_path, &ref_bmp_on_disk);

    if (!found_ref_img && ref_img_option_ == kReferenceImageCheckedIn) {
      LOG(ERROR) << "Couldn't find reference image: "
                 << img_path.value();
      // No image to compare to, exit early.
      return false;
    }

    const SkBitmap* ref_bmp;
    bool save_gen = false;
    bool save_diff = true;
    bool rt = true;

    if ((ref_img_revision_ <= 0 && ref_img_option_ == kReferenceImageLocal) ||
        !found_ref_img) {
      chrome::VersionInfo chrome_version_info;
      FilePath rev_path = ref_img_dir_.AppendASCII(
          test_name_ + "_" + chrome_version_info.LastChange() + ".rev");
      if (!WritePNGFile(gen_bmp, img_path)) {
        LOG(ERROR) << "Can't save generated image to: "
                   << img_path.value()
                   << " as future reference.";
        rt = false;
      } else {
        LOG(INFO) << "Saved reference image to: "
                  << img_path.value();
      }
      if (rt) {
        if (!WriteREVFile(rev_path)) {
          LOG(ERROR) << "Can't save revision file to: "
                     << rev_path.value();
          rt = false;
          file_util::Delete(img_path, false);
        } else {
          LOG(INFO) << "Saved revision file to: "
                    << rev_path.value();
        }
      }
      if (ref_img_revision_ > 0) {
        LOG(ERROR) << "Can't read the local ref image: "
                   << img_path.value()
                   << ", reset it.";
        rt = false;
      }
      // If we re-generate the ref image, we save the gen and diff images so
      // the ref image can be uploaded to the server and be viewed later.
      save_gen = true;
      save_diff = true;
      ref_bmp = &gen_bmp;
    } else {
      ref_bmp = &ref_bmp_on_disk;
    }

    SkBitmap diff_bmp;
    if (ref_bmp->width() != gen_bmp.width() ||
        ref_bmp->height() != gen_bmp.height()) {
      LOG(ERROR)
          << "Dimensions do not match (Expected) vs (Actual):"
          << "(" << ref_bmp->width() << "x" << ref_bmp->height()
              << ") vs. "
          << "(" << gen_bmp.width() << "x" << gen_bmp.height() << ")";
      if (ref_img_option_ == kReferenceImageLocal)
        save_gen = true;
      rt = false;
    } else {
      // Compare pixels and create a simple diff image.
      int diff_pixels_count = 0;
      diff_bmp.setConfig(SkBitmap::kARGB_8888_Config,
                         gen_bmp.width(), gen_bmp.height());
      diff_bmp.allocPixels();
      diff_bmp.eraseColor(SK_ColorWHITE);
      SkAutoLockPixels lock_bmp(gen_bmp);
      SkAutoLockPixels lock_ref_bmp(*ref_bmp);
      SkAutoLockPixels lock_diff_bmp(diff_bmp);
      // The reference images were saved with no alpha channel. Use the mask to
      // set alpha to 0.
      uint32_t kAlphaMask = 0x00FFFFFF;
      for (int x = 0; x < gen_bmp.width(); ++x) {
        for (int y = 0; y < gen_bmp.height(); ++y) {
          if (skip_bottom_corners &&
              (((x < kCornerDecorationSize ||
                 x >= gen_bmp.width() - kCornerDecorationSize) &&
                y >= gen_bmp.height() - kCornerDecorationSize) ||
               (x < kSideDecorationSize ||
                x >= gen_bmp.width() - kSideDecorationSize)))
            continue;
          if ((*gen_bmp.getAddr32(x, y) & kAlphaMask) !=
              (*ref_bmp->getAddr32(x, y) & kAlphaMask)) {
            ++diff_pixels_count;
            *diff_bmp.getAddr32(x, y) = 192 << 16;  // red
          }
        }
      }
      if (diff_pixels_count > 0) {
        LOG(ERROR) << diff_pixels_count
                   << " pixels do not match.";
        if (ref_img_option_ == kReferenceImageLocal) {
          save_gen = true;
          save_diff = true;
        }
        rt = false;
      }
    }

    std::string ref_img_filename = img_path.BaseName().MaybeAsASCII();
    if (save_gen) {
      FilePath img_fail_path = generated_img_dir_.AppendASCII(
          "FAIL_" + ref_img_filename);
      if (!WritePNGFile(gen_bmp, img_fail_path)) {
        LOG(ERROR) << "Can't save generated image to: "
                   << img_fail_path.value();
      } else {
        LOG(INFO) << "Saved generated image to: "
                  << img_fail_path.value();
      }
    }
    if (save_diff) {
      FilePath img_diff_path = generated_img_dir_.AppendASCII(
          "DIFF_" + ref_img_filename);
      if (!WritePNGFile(diff_bmp, img_diff_path)) {
        LOG(ERROR) << "Can't save generated diff image to: "
                   << img_diff_path.value();
      } else {
        LOG(INFO) << "Saved difference image to: "
                  << img_diff_path.value();
      }
    }
    return rt;
  }

  bool ComparePixels(const SkBitmap& gen_bmp,
                     const ReferencePixel* ref_pixels,
                     size_t ref_pixel_count) {
    SkAutoLockPixels lock_bmp(gen_bmp);

    for (size_t i = 0; i < ref_pixel_count; ++i) {
      int x = ref_pixels[i].x;
      int y = ref_pixels[i].y;
      unsigned char r = ref_pixels[i].r;
      unsigned char g = ref_pixels[i].g;
      unsigned char b = ref_pixels[i].b;

      DCHECK(x >= 0 && x < gen_bmp.width() && y >= 0 && y < gen_bmp.height());

      unsigned char* rgba = reinterpret_cast<unsigned char*>(
          gen_bmp.getAddr32(x, y));
      DCHECK(rgba);
      if (rgba[0] != b || rgba[1] != g || rgba[2] != r) {
        std::string error_message = base::StringPrintf(
            "pixel(%d,%d) expects [%u,%u,%u], but gets [%u,%u,%u] instead",
            x, y, r, g, b, rgba[0], rgba[1], rgba[2]);
        LOG(ERROR) << error_message.c_str();
        return false;
      }
    }
    return true;
  }

  // Returns a gfx::Rect representing the bounds that the browser window should
  // have if the tab contents have the desired size.
  gfx::Rect GetNewTabContainerBounds(const gfx::Size& desired_size) {
    gfx::Rect container_rect;
    chrome::GetActiveWebContents(browser())->GetContainerBounds(&container_rect);
    // Size cannot be negative, so use a point.
    gfx::Point correction(
        desired_size.width() - container_rect.size().width(),
        desired_size.height() - container_rect.size().height());

    gfx::Rect window_rect = browser()->window()->GetRestoredBounds();
    gfx::Size new_size = window_rect.size();
    new_size.Enlarge(correction.x(), correction.y());
    window_rect.set_size(new_size);
    return window_rect;
  }

  // Take snapshot of the current tab, encode it as PNG, and save to a SkBitmap.
  bool TabSnapShotToImage(SkBitmap* bitmap) {
    CHECK(bitmap);
    std::vector<unsigned char> png;

    gfx::Rect root_bounds = browser()->window()->GetBounds();
    gfx::Rect tab_contents_bounds;
    chrome::GetActiveWebContents(browser())->GetContainerBounds(
        &tab_contents_bounds);

    gfx::Rect snapshot_bounds(tab_contents_bounds.x() - root_bounds.x(),
                              tab_contents_bounds.y() - root_bounds.y(),
                              tab_contents_bounds.width(),
                              tab_contents_bounds.height());

    gfx::NativeWindow native_window = browser()->window()->GetNativeWindow();
    if (!chrome::GrabWindowSnapshotForUser(native_window, &png,
                                           snapshot_bounds)) {
      LOG(ERROR) << "browser::GrabWindowSnapShot() failed";
      return false;
    }

    if (!gfx::PNGCodec::Decode(reinterpret_cast<unsigned char*>(&*png.begin()),
                               png.size(), bitmap)) {
      LOG(ERROR) << "Decode PNG to a SkBitmap failed";
      return false;
    }
    return true;
  }

  // If no valid local revision file is located, the ref_img_revision_ is 0.
  void ObtainLocalRefImageRevision() {
    FilePath filter;
    filter = filter.AppendASCII(test_name_ + "_*.rev");
    file_util::FileEnumerator locator(ref_img_dir_,
                                      false,  // non recursive
                                      file_util::FileEnumerator::FILES,
                                      filter.value());
    int64 max_revision = 0;
    std::vector<FilePath> outdated_revs;
    for (FilePath full_path = locator.Next();
         !full_path.empty();
         full_path = locator.Next()) {
      std::string filename =
          full_path.BaseName().RemoveExtension().MaybeAsASCII();
      std::string revision_string =
          filename.substr(test_name_.length() + 1);
      int64 revision = 0;
      bool converted = base::StringToInt64(revision_string, &revision);
      if (!converted)
        continue;
      if (revision < ref_img_revision_no_older_than_ ||
          revision < max_revision) {
        outdated_revs.push_back(full_path);
        continue;
      }
      max_revision = revision;
    }
    ref_img_revision_ = max_revision;
    for (size_t i = 0; i < outdated_revs.size(); ++i)
      file_util::Delete(outdated_revs[i], false);
  }

  DISALLOW_COPY_AND_ASSIGN(GpuPixelBrowserTest);
};

IN_PROC_BROWSER_TEST_F(GpuPixelBrowserTest, WebGLGreenTriangle) {
  // If test baseline needs to be updated after a given revision, update the
  // following number. If no revision requirement, then 0.
  const int64 ref_img_revision_update = 123489;

  const ReferencePixel ref_pixels[] = {
    // x, y, r, g, b
    {50, 100, 0, 0, 0},
    {100, 100, 0, 255, 0},
    {150, 100, 0, 0, 0},
    {50, 150, 0, 255, 0},
    {100, 150, 0, 255, 0},
    {150, 150, 0, 255, 0}
  };
  const size_t ref_pixel_count = sizeof(ref_pixels) / sizeof(ReferencePixel);

  gfx::Size container_size(400, 300);
  FilePath url =
      test_data_dir().AppendASCII("pixel_webgl.html");
  RunPixelTest(container_size, url, ref_img_revision_update,
               ref_pixels, ref_pixel_count);
}

IN_PROC_BROWSER_TEST_F(GpuPixelBrowserTest, CSS3DBlueBox) {
  // If test baseline needs to be updated after a given revision, update the
  // following number. If no revision requirement, then 0.
  const int64 ref_img_revision_update = 123489;

  const ReferencePixel ref_pixels[] = {
    // x, y, r, g, b
    {70, 50, 0, 0, 255},
    {150, 50, 0, 0, 0},
    {70, 90, 0, 0, 255},
    {150, 90, 0, 0, 255},
    {70, 125, 0, 0, 255},
    {150, 125, 0, 0, 0}
  };
  const size_t ref_pixel_count = sizeof(ref_pixels) / sizeof(ReferencePixel);

  gfx::Size container_size(400, 300);
  FilePath url =
      test_data_dir().AppendASCII("pixel_css3d.html");
  RunPixelTest(container_size, url, ref_img_revision_update,
               ref_pixels, ref_pixel_count);
}

IN_PROC_BROWSER_TEST_F(GpuPixelBrowserTest, Canvas2DRedBoxHD) {
  // If test baseline needs to be updated after a given revision, update the
  // following number. If no revision requirement, then 0.
  const int64 ref_img_revision_update = 123489;

  const ReferencePixel ref_pixels[] = {
    // x, y, r, g, b
    {40, 100, 0, 0, 0},
    {60, 100, 127, 0, 0},
    {140, 100, 127, 0, 0},
    {160, 100, 0, 0, 0}
  };
  const size_t ref_pixel_count = sizeof(ref_pixels) / sizeof(ReferencePixel);

  gfx::Size container_size(400, 300);
  FilePath url =
      test_data_dir().AppendASCII("pixel_canvas2d.html");
  RunPixelTest(container_size, url, ref_img_revision_update,
               ref_pixels, ref_pixel_count);
}

class Canvas2DPixelTestSD : public GpuPixelBrowserTest {
 public:
  virtual void SetUpCommandLine(CommandLine* command_line) {
    GpuPixelBrowserTest::SetUpCommandLine(command_line);
    command_line->AppendSwitch(switches::kDisableAccelerated2dCanvas);
  }
};

IN_PROC_BROWSER_TEST_F(Canvas2DPixelTestSD, Canvas2DRedBoxSD) {
  // If test baseline needs to be updated after a given revision, update the
  // following number. If no revision requirement, then 0.
  const int64 ref_img_revision_update = 123489;

  const ReferencePixel ref_pixels[] = {
    // x, y, r, g, b
    {40, 100, 0, 0, 0},
    {60, 100, 127, 0, 0},
    {140, 100, 127, 0, 0},
    {160, 100, 0, 0, 0}
  };
  const size_t ref_pixel_count = sizeof(ref_pixels) / sizeof(ReferencePixel);

  gfx::Size container_size(400, 300);
  FilePath url =
      test_data_dir().AppendASCII("pixel_canvas2d.html");
  RunPixelTest(container_size, url, ref_img_revision_update,
               ref_pixels, ref_pixel_count);
}
