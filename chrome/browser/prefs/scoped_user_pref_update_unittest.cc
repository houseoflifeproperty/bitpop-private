// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "base/prefs/public/pref_change_registrar.h"
#include "chrome/browser/prefs/mock_pref_change_callback.h"
#include "chrome/browser/prefs/scoped_user_pref_update.h"
#include "chrome/test/base/testing_pref_service.h"
#include "testing/gmock/include/gmock/gmock.h"
#include "testing/gtest/include/gtest/gtest.h"

using testing::_;
using testing::Mock;

class ScopedUserPrefUpdateTest : public testing::Test {
 public:
  ScopedUserPrefUpdateTest() : observer_(&prefs_) {}
  ~ScopedUserPrefUpdateTest() {}

 protected:
  virtual void SetUp() {
    prefs_.RegisterDictionaryPref(kPref, PrefService::UNSYNCABLE_PREF);
    registrar_.Init(&prefs_);
    registrar_.Add(kPref, observer_.GetCallback());
  }

  static const char kPref[];
  static const char kKey[];
  static const char kValue[];

  TestingPrefService prefs_;
  MockPrefChangeCallback observer_;
  PrefChangeRegistrar registrar_;
};

const char ScopedUserPrefUpdateTest::kPref[] = "name";
const char ScopedUserPrefUpdateTest::kKey[] = "key";
const char ScopedUserPrefUpdateTest::kValue[] = "value";

TEST_F(ScopedUserPrefUpdateTest, RegularUse) {
  // Dictionary that will be expected to be set at the end.
  DictionaryValue expected_dictionary;
  expected_dictionary.SetString(kKey, kValue);

  {
    EXPECT_CALL(observer_, OnPreferenceChanged(_)).Times(0);
    DictionaryPrefUpdate update(&prefs_, kPref);
    DictionaryValue* value = update.Get();
    ASSERT_TRUE(value);
    value->SetString(kKey, kValue);

    // The dictionary was created for us but the creation should have happened
    // silently without notifications.
    Mock::VerifyAndClearExpectations(&observer_);

    // Modifications happen online and are instantly visible, though.
    const DictionaryValue* current_value = prefs_.GetDictionary(kPref);
    ASSERT_TRUE(current_value);
    EXPECT_TRUE(expected_dictionary.Equals(current_value));

    // Now we are leaving the scope of the update so we should be notified.
    observer_.Expect(kPref, &expected_dictionary);
  }
  Mock::VerifyAndClearExpectations(&observer_);

  const DictionaryValue* current_value = prefs_.GetDictionary(kPref);
  ASSERT_TRUE(current_value);
  EXPECT_TRUE(expected_dictionary.Equals(current_value));
}

TEST_F(ScopedUserPrefUpdateTest, NeverTouchAnything) {
  const DictionaryValue* old_value = prefs_.GetDictionary(kPref);
  EXPECT_CALL(observer_, OnPreferenceChanged(_)).Times(0);
  {
    DictionaryPrefUpdate update(&prefs_, kPref);
  }
  const DictionaryValue* new_value = prefs_.GetDictionary(kPref);
  EXPECT_EQ(old_value, new_value);
  Mock::VerifyAndClearExpectations(&observer_);
}
