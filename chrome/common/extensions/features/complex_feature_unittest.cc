// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "chrome/common/extensions/features/complex_feature.h"

#include "chrome/common/extensions/features/simple_feature.h"
#include "chrome/common/extensions/value_builder.h"
#include "testing/gtest/include/gtest/gtest.h"

using chrome::VersionInfo;
using extensions::ComplexFeature;
using extensions::DictionaryBuilder;
using extensions::Extension;
using extensions::Feature;
using extensions::ListBuilder;
using extensions::SimpleFeature;

namespace {

class ExtensionComplexFeatureTest : public testing::Test {
 protected:
  ExtensionComplexFeatureTest()
      : current_channel_(VersionInfo::CHANNEL_UNKNOWN) {}
  virtual ~ExtensionComplexFeatureTest() {}

 private:
  Feature::ScopedCurrentChannel current_channel_;
};

TEST_F(ExtensionComplexFeatureTest, MultipleRulesWhitelist) {
  scoped_ptr<ComplexFeature::FeatureList> features(
      new ComplexFeature::FeatureList());

  // Rule: "extension", whitelist "foo".
  scoped_ptr<SimpleFeature> simple_feature(new SimpleFeature());
  scoped_ptr<DictionaryValue> rule(
      DictionaryBuilder()
      .Set("whitelist", ListBuilder().Append("foo"))
      .Set("extension_types", ListBuilder().Append("extension")).Build());
  simple_feature->Parse(rule.get());
  features->push_back(simple_feature.release());

  // Rule: "packaged_app", whitelist "bar".
  simple_feature.reset(new SimpleFeature());
  rule = DictionaryBuilder()
      .Set("whitelist", ListBuilder().Append("bar"))
      .Set("extension_types", ListBuilder().Append("packaged_app")).Build();
  simple_feature->Parse(rule.get());
  features->push_back(simple_feature.release());

  scoped_ptr<ComplexFeature> feature(new ComplexFeature(features.Pass()));

  // Test match 1st rule.
  EXPECT_EQ(Feature::IS_AVAILABLE, feature->IsAvailableToManifest(
      "foo",
      Extension::TYPE_EXTENSION,
      Feature::UNSPECIFIED_LOCATION,
      Feature::UNSPECIFIED_PLATFORM,
      Feature::GetCurrentPlatform()).result());

  // Test match 2nd rule.
  EXPECT_EQ(Feature::IS_AVAILABLE, feature->IsAvailableToManifest(
      "bar",
      Extension::TYPE_LEGACY_PACKAGED_APP,
      Feature::UNSPECIFIED_LOCATION,
      Feature::UNSPECIFIED_PLATFORM,
      Feature::GetCurrentPlatform()).result());

  // Test whitelist with wrong extension type.
  EXPECT_NE(Feature::IS_AVAILABLE, feature->IsAvailableToManifest(
      "bar",
      Extension::TYPE_EXTENSION,
      Feature::UNSPECIFIED_LOCATION,
      Feature::UNSPECIFIED_PLATFORM,
      Feature::GetCurrentPlatform()).result());
  EXPECT_NE(Feature::IS_AVAILABLE, feature->IsAvailableToManifest(
      "foo",
      Extension::TYPE_LEGACY_PACKAGED_APP,
      Feature::UNSPECIFIED_LOCATION,
      Feature::UNSPECIFIED_PLATFORM,
      Feature::GetCurrentPlatform()).result());
}

TEST_F(ExtensionComplexFeatureTest, MultipleRulesChannels) {
  scoped_ptr<ComplexFeature::FeatureList> features(
      new ComplexFeature::FeatureList());

  // Rule: "extension", channel trunk.
  scoped_ptr<SimpleFeature> simple_feature(new SimpleFeature());
  scoped_ptr<DictionaryValue> rule(
      DictionaryBuilder()
      .Set("channel", "trunk")
      .Set("extension_types", ListBuilder().Append("extension")).Build());
  simple_feature->Parse(rule.get());
  features->push_back(simple_feature.release());

  // Rule: "packaged_app", channel stable.
  simple_feature.reset(new SimpleFeature());
  rule = DictionaryBuilder()
      .Set("channel", "stable")
      .Set("extension_types", ListBuilder().Append("packaged_app")).Build();
  simple_feature->Parse(rule.get());
  features->push_back(simple_feature.release());

  scoped_ptr<ComplexFeature> feature(new ComplexFeature(features.Pass()));

  // Test match 1st rule.
  {
    Feature::ScopedCurrentChannel current_channel(VersionInfo::CHANNEL_UNKNOWN);
    EXPECT_EQ(Feature::IS_AVAILABLE, feature->IsAvailableToManifest(
        "1",
        Extension::TYPE_EXTENSION,
        Feature::UNSPECIFIED_LOCATION,
        Feature::UNSPECIFIED_PLATFORM,
        Feature::GetCurrentPlatform()).result());
  }

  // Test match 2nd rule.
  {
    Feature::ScopedCurrentChannel current_channel(VersionInfo::CHANNEL_BETA);
    EXPECT_EQ(Feature::IS_AVAILABLE, feature->IsAvailableToManifest(
        "2",
        Extension::TYPE_LEGACY_PACKAGED_APP,
        Feature::UNSPECIFIED_LOCATION,
        Feature::UNSPECIFIED_PLATFORM,
        Feature::GetCurrentPlatform()).result());
  }

  // Test feature not available to extensions above channel unknown.
  {
    Feature::ScopedCurrentChannel current_channel(VersionInfo::CHANNEL_BETA);
    EXPECT_NE(Feature::IS_AVAILABLE, feature->IsAvailableToManifest(
        "1",
        Extension::TYPE_EXTENSION,
        Feature::UNSPECIFIED_LOCATION,
        Feature::UNSPECIFIED_PLATFORM,
        Feature::GetCurrentPlatform()).result());
  }
}

}  // namespace
