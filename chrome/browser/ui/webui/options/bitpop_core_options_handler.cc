// Copyright (c) 2012-2013 House of Life Property Ltd. All rights reserved.
// Copyright (c) 2012-2013 Crystalnix <vgachkaylo@crystalnix.com>
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "chrome/browser/ui/webui/options/bitpop_core_options_handler.h"

#include "base/bind.h"
#include "base/bind_helpers.h"
#include "base/json/json_reader.h"
#include "base/memory/scoped_ptr.h"
#include "base/string16.h"
#include "base/string_number_conversions.h"
#include "base/utf_string_conversions.h"
#include "base/values.h"
#include "chrome/browser/browser_process.h"
#include "chrome/browser/net/url_fixer_upper.h"
#include "chrome/browser/profiles/profile.h"
#include "chrome/browser/ui/options/options_util.h"
#include "chrome/common/chrome_notification_types.h"
#include "chrome/common/pref_names.h"
#include "chrome/common/url_constants.h"
#include "content/public/browser/notification_details.h"
#include "content/public/browser/notification_types.h"
#include "content/public/browser/user_metrics.h"
#include "content/public/browser/web_ui.h"
#include "googleurl/src/gurl.h"
#include "grit/chromium_strings.h"
#include "grit/generated_resources.h"
#include "grit/locale_settings.h"
#include "grit/theme_resources.h"
#include "ui/base/l10n/l10n_util.h"

using content::UserMetricsAction;

namespace options {

namespace {
  
  // Only allow changes to the metrics reporting checkbox if we were succesfully
  // able to change the service.
  bool AllowMetricsReportingChange(const base::Value* to_value) {
    bool enable;
    if (!to_value->GetAsBoolean(&enable)) {
      NOTREACHED();
      return false;
    }
    
    return enable == OptionsUtil::ResolveMetricsReportingEnabled(enable);
  }
  
}  // namespace

BitpopCoreOptionsHandler::BitpopCoreOptionsHandler()
    : handlers_host_(NULL) {
}

BitpopCoreOptionsHandler::~BitpopCoreOptionsHandler() {}

void BitpopCoreOptionsHandler::InitializeHandler() {
  Profile* profile = Profile::FromWebUI(web_ui());

  plugin_status_pref_setter_.Init(
      profile,
      base::Bind(&BitpopCoreOptionsHandler::OnPreferenceChanged,
                 base::Unretained(this),
                 profile->GetPrefs()));

  pref_change_filters_[prefs::kMetricsReportingEnabled] =
      base::Bind(&AllowMetricsReportingChange);
}

void BitpopCoreOptionsHandler::InitializePage() {
  UpdateClearPluginLSOData();
  UpdatePepperFlashSettingsEnabled();
}

void BitpopCoreOptionsHandler::GetLocalizedValues(
    DictionaryValue* localized_strings) {
  GetStaticLocalizedValues(localized_strings);
}

void BitpopCoreOptionsHandler::GetStaticLocalizedValues(
    base::DictionaryValue* localized_strings) {
  DCHECK(localized_strings);
  // Main
  localized_strings->SetString("optionsPageTitle",
      l10n_util::GetStringUTF16(IDS_SETTINGS_TITLE));

  // Controlled settings bubble.
  localized_strings->SetString("controlledSettingPolicy",
      l10n_util::GetStringUTF16(IDS_OPTIONS_CONTROLLED_SETTING_POLICY));
  localized_strings->SetString("controlledSettingExtension",
      l10n_util::GetStringUTF16(IDS_OPTIONS_CONTROLLED_SETTING_EXTENSION));
  localized_strings->SetString("controlledSettingRecommended",
      l10n_util::GetStringUTF16(IDS_OPTIONS_CONTROLLED_SETTING_RECOMMENDED));
  localized_strings->SetString("controlledSettingHasRecommendation",
      l10n_util::GetStringUTF16(
          IDS_OPTIONS_CONTROLLED_SETTING_HAS_RECOMMENDATION));
  localized_strings->SetString("controlledSettingFollowRecommendation",
      l10n_util::GetStringUTF16(
          IDS_OPTIONS_CONTROLLED_SETTING_FOLLOW_RECOMMENDATION));
  localized_strings->SetString("controlledSettingsPolicy",
      l10n_util::GetStringUTF16(IDS_OPTIONS_CONTROLLED_SETTINGS_POLICY));
  localized_strings->SetString("controlledSettingsExtension",
      l10n_util::GetStringUTF16(IDS_OPTIONS_CONTROLLED_SETTINGS_EXTENSION));

  // Search
  RegisterTitle(localized_strings, "searchPage", IDS_OPTIONS_SEARCH_PAGE_TITLE);
  localized_strings->SetString("searchPlaceholder",
      l10n_util::GetStringUTF16(IDS_OPTIONS_SEARCH_PLACEHOLDER));
  localized_strings->SetString("searchPageNoMatches",
      l10n_util::GetStringUTF16(IDS_OPTIONS_SEARCH_PAGE_NO_MATCHES));
  localized_strings->SetString("searchPageHelpLabel",
      l10n_util::GetStringUTF16(IDS_OPTIONS_SEARCH_PAGE_HELP_LABEL));
  localized_strings->SetString("searchPageHelpTitle",
      l10n_util::GetStringFUTF16(IDS_OPTIONS_SEARCH_PAGE_HELP_TITLE,
          l10n_util::GetStringUTF16(IDS_PRODUCT_NAME)));
  localized_strings->SetString("searchPageHelpURL",
                               chrome::kSettingsSearchHelpURL);

  // Common
  localized_strings->SetString("ok",
      l10n_util::GetStringUTF16(IDS_OK));
  localized_strings->SetString("cancel",
      l10n_util::GetStringUTF16(IDS_CANCEL));
  localized_strings->SetString("learnMore",
      l10n_util::GetStringUTF16(IDS_LEARN_MORE));
  localized_strings->SetString("close",
      l10n_util::GetStringUTF16(IDS_CLOSE));
  localized_strings->SetString("done",
      l10n_util::GetStringUTF16(IDS_DONE));
}

void BitpopCoreOptionsHandler::Uninitialize() {
  std::string last_pref;
  for (PreferenceCallbackMap::const_iterator iter = pref_callback_map_.begin();
       iter != pref_callback_map_.end();
       ++iter) {
    if (last_pref != iter->first) {
      StopObservingPref(iter->first);
      last_pref = iter->first;
    }
  }
}

void BitpopCoreOptionsHandler::OnPreferenceChanged(PrefServiceBase* service,
                                             const std::string& pref_name) {
  if (pref_name == prefs::kClearPluginLSODataEnabled) {
    // This preference is stored in Local State, not in the user preferences.
    UpdateClearPluginLSOData();
    return;
  }
  if (pref_name == prefs::kPepperFlashSettingsEnabled) {
    UpdatePepperFlashSettingsEnabled();
    return;
  }
  NotifyPrefChanged(pref_name, std::string());
}

void BitpopCoreOptionsHandler::RegisterMessages() {
  registrar_.Init(Profile::FromWebUI(web_ui())->GetPrefs());
  local_state_registrar_.Init(g_browser_process->local_state());

  web_ui()->RegisterMessageCallback("coreOptionsInitialize",
      base::Bind(&BitpopCoreOptionsHandler::HandleInitialize,
                 base::Unretained(this)));
  web_ui()->RegisterMessageCallback("fetchPrefs",
      base::Bind(&BitpopCoreOptionsHandler::HandleFetchPrefs,
                 base::Unretained(this)));
  web_ui()->RegisterMessageCallback("observePrefs",
      base::Bind(&BitpopCoreOptionsHandler::HandleObservePrefs,
                 base::Unretained(this)));
  web_ui()->RegisterMessageCallback("setBooleanPref",
      base::Bind(&BitpopCoreOptionsHandler::HandleSetBooleanPref,
                 base::Unretained(this)));
  web_ui()->RegisterMessageCallback("setIntegerPref",
      base::Bind(&BitpopCoreOptionsHandler::HandleSetIntegerPref,
                 base::Unretained(this)));
  web_ui()->RegisterMessageCallback("setDoublePref",
      base::Bind(&BitpopCoreOptionsHandler::HandleSetDoublePref,
                 base::Unretained(this)));
  web_ui()->RegisterMessageCallback("setStringPref",
      base::Bind(&BitpopCoreOptionsHandler::HandleSetStringPref,
                 base::Unretained(this)));
  web_ui()->RegisterMessageCallback("setURLPref",
      base::Bind(&BitpopCoreOptionsHandler::HandleSetURLPref,
                 base::Unretained(this)));
  web_ui()->RegisterMessageCallback("setListPref",
      base::Bind(&BitpopCoreOptionsHandler::HandleSetListPref,
                 base::Unretained(this)));
  web_ui()->RegisterMessageCallback("clearPref",
      base::Bind(&BitpopCoreOptionsHandler::HandleClearPref,
                 base::Unretained(this)));
  web_ui()->RegisterMessageCallback("coreOptionsUserMetricsAction",
      base::Bind(&BitpopCoreOptionsHandler::HandleUserMetricsAction,
                 base::Unretained(this)));
}

void BitpopCoreOptionsHandler::HandleInitialize(const ListValue* args) {
  DCHECK(handlers_host_);
  handlers_host_->InitializeHandlers();
}

base::Value* BitpopCoreOptionsHandler::FetchPref(const std::string& pref_name) {
  return CreateValueForPref(pref_name, std::string());
}

void BitpopCoreOptionsHandler::ObservePref(const std::string& pref_name) {
  if (g_browser_process->local_state()->FindPreference(pref_name.c_str())) {
    local_state_registrar_.Add(
        pref_name.c_str(),
        base::Bind(&BitpopCoreOptionsHandler::OnPreferenceChanged,
                   base::Unretained(this),
                   local_state_registrar_.prefs()));
  } else {
    registrar_.Add(
        pref_name.c_str(),
        base::Bind(&BitpopCoreOptionsHandler::OnPreferenceChanged,
                   base::Unretained(this),
                   registrar_.prefs()));
  }
}

void BitpopCoreOptionsHandler::StopObservingPref(const std::string& pref_name) {
  if (g_browser_process->local_state()->FindPreference(pref_name.c_str()))
    local_state_registrar_.Remove(pref_name.c_str());
  else
    registrar_.Remove(pref_name.c_str());
}

void BitpopCoreOptionsHandler::SetPref(const std::string& pref_name,
                                 const base::Value* value,
                                 const std::string& metric) {
  PrefService* pref_service = FindServiceForPref(pref_name);
  PrefChangeFilterMap::iterator iter = pref_change_filters_.find(pref_name);
  if (iter != pref_change_filters_.end()) {
    // Also check if the pref is user modifiable (don't even try to run the
    // filter function if the user is not allowed to change the pref).
    const PrefService::Preference* pref =
        pref_service->FindPreference(pref_name.c_str());
    if ((pref && !pref->IsUserModifiable()) || !iter->second.Run(value)) {
      // Reject the change; remind the page of the true value.
      NotifyPrefChanged(pref_name, std::string());
      return;
    }
  }

  switch (value->GetType()) {
    case base::Value::TYPE_BOOLEAN:
    case base::Value::TYPE_INTEGER:
    case base::Value::TYPE_DOUBLE:
    case base::Value::TYPE_STRING:
      pref_service->Set(pref_name.c_str(), *value);
      break;

    default:
      NOTREACHED();
      return;
  }

  ProcessUserMetric(value, metric);
}

void BitpopCoreOptionsHandler::ClearPref(const std::string& pref_name,
                                   const std::string& metric) {
  PrefService* pref_service = FindServiceForPref(pref_name);
  pref_service->ClearPref(pref_name.c_str());

  if (!metric.empty())
    content::RecordComputedAction(metric);
}

void BitpopCoreOptionsHandler::ProcessUserMetric(const base::Value* value,
                                           const std::string& metric) {
  if (metric.empty())
    return;

  std::string metric_string = metric;
  if (value->IsType(base::Value::TYPE_BOOLEAN)) {
    bool bool_value;
    CHECK(value->GetAsBoolean(&bool_value));
    metric_string += bool_value ? "_Enable" : "_Disable";
  }

  content::RecordComputedAction(metric_string);
}

void BitpopCoreOptionsHandler::NotifyPrefChanged(
    const std::string& pref_name,
    const std::string& controlling_pref_name) {
  scoped_ptr<base::Value> value(
      CreateValueForPref(pref_name, controlling_pref_name));
  DispatchPrefChangeNotification(pref_name, value.Pass());
}

void BitpopCoreOptionsHandler::DispatchPrefChangeNotification(
    const std::string& name,
    scoped_ptr<base::Value> value) {
  std::pair<PreferenceCallbackMap::const_iterator,
            PreferenceCallbackMap::const_iterator> range =
      pref_callback_map_.equal_range(name);
  ListValue result_value;
  result_value.Append(new base::StringValue(name.c_str()));
  result_value.Append(value.release());
  for (PreferenceCallbackMap::const_iterator iter = range.first;
       iter != range.second; ++iter) {
    const std::string& callback_function = iter->second;
    web_ui()->CallJavascriptFunction(callback_function, result_value);
  }
}

base::Value* BitpopCoreOptionsHandler::CreateValueForPref(
    const std::string& pref_name,
    const std::string& controlling_pref_name) {
  const PrefService* pref_service = FindServiceForPref(pref_name.c_str());
  const PrefService::Preference* pref =
      pref_service->FindPreference(pref_name.c_str());
  if (!pref) {
    NOTREACHED();
    return base::Value::CreateNullValue();
}
  const PrefService::Preference* controlling_pref =
      pref_service->FindPreference(controlling_pref_name.c_str());
  if (!controlling_pref)
    controlling_pref = pref;

  DictionaryValue* dict = new DictionaryValue;
  dict->Set("value", pref->GetValue()->DeepCopy());
  if (controlling_pref->IsManaged())
    dict->SetString("controlledBy", "policy");
  else if (controlling_pref->IsExtensionControlled())
    dict->SetString("controlledBy", "extension");
  else if (controlling_pref->IsRecommended())
    dict->SetString("controlledBy", "recommended");

  const base::Value* recommended_value =
      controlling_pref->GetRecommendedValue();
  if (recommended_value)
    dict->Set("recommendedValue", recommended_value->DeepCopy());
  dict->SetBoolean("disabled", !controlling_pref->IsUserModifiable());
  return dict;
}

PrefService* BitpopCoreOptionsHandler::FindServiceForPref(
    const std::string& pref_name) {
  // Proxy is a peculiar case: on ChromeOS, settings exist in both user
  // prefs and local state, but chrome://settings should affect only user prefs.
  // Elsewhere the proxy settings are stored in local state.
  // See http://crbug.com/157147
  PrefService* user_prefs = Profile::FromWebUI(web_ui())->GetPrefs();
  if (pref_name == prefs::kProxy)
#if defined(OS_CHROMEOS)
    return user_prefs;
#else
    return g_browser_process->local_state();
#endif

  // Find which PrefService contains the given pref. Pref names should not
  // be duplicated across services, however if they are, prefer the user's
  // prefs.
  if (user_prefs->FindPreference(pref_name.c_str()))
    return user_prefs;

  if (g_browser_process->local_state()->FindPreference(pref_name.c_str()))
    return g_browser_process->local_state();

  return user_prefs;
}

void BitpopCoreOptionsHandler::HandleFetchPrefs(const ListValue* args) {
  // First param is name of callback function, so, there needs to be at least
  // one more element for the actual preference identifier.
  DCHECK_GE(static_cast<int>(args->GetSize()), 2);

  // Get callback JS function name.
  const base::Value* callback;
  if (!args->Get(0, &callback) || !callback->IsType(base::Value::TYPE_STRING))
    return;

  string16 callback_function;
  if (!callback->GetAsString(&callback_function))
    return;

  // Get the list of name for prefs to build the response dictionary.
  DictionaryValue result_value;
  const base::Value* list_member;

  for (size_t i = 1; i < args->GetSize(); i++) {
    if (!args->Get(i, &list_member))
      break;

    if (!list_member->IsType(base::Value::TYPE_STRING))
      continue;

    std::string pref_name;
    if (!list_member->GetAsString(&pref_name))
      continue;

    result_value.Set(pref_name.c_str(), FetchPref(pref_name));
  }
  web_ui()->CallJavascriptFunction(UTF16ToASCII(callback_function),
                                   result_value);
}

void BitpopCoreOptionsHandler::HandleObservePrefs(const ListValue* args) {
  // First param is name is JS callback function name, the rest are pref
  // identifiers that we are observing.
  DCHECK_GE(static_cast<int>(args->GetSize()), 2);

  // Get preference change callback function name.
  std::string callback_func_name;
  if (!args->GetString(0, &callback_func_name))
    return;

  // Get all other parameters - pref identifiers.
  for (size_t i = 1; i < args->GetSize(); i++) {
    const base::Value* list_member;
    if (!args->Get(i, &list_member))
      break;

    // Just ignore bad pref identifiers for now.
    std::string pref_name;
    if (!list_member->IsType(base::Value::TYPE_STRING) ||
        !list_member->GetAsString(&pref_name))
      continue;

    if (pref_callback_map_.find(pref_name) == pref_callback_map_.end())
      ObservePref(pref_name);

    pref_callback_map_.insert(
        PreferenceCallbackMap::value_type(pref_name, callback_func_name));
  }
}

void BitpopCoreOptionsHandler::HandleSetBooleanPref(const ListValue* args) {
  HandleSetPref(args, TYPE_BOOLEAN);
}

void BitpopCoreOptionsHandler::HandleSetIntegerPref(const ListValue* args) {
  HandleSetPref(args, TYPE_INTEGER);
}

void BitpopCoreOptionsHandler::HandleSetDoublePref(const ListValue* args) {
  HandleSetPref(args, TYPE_DOUBLE);
}

void BitpopCoreOptionsHandler::HandleSetStringPref(const ListValue* args) {
  HandleSetPref(args, TYPE_STRING);
}

void BitpopCoreOptionsHandler::HandleSetURLPref(const ListValue* args) {
  HandleSetPref(args, TYPE_URL);
}

void BitpopCoreOptionsHandler::HandleSetListPref(const ListValue* args) {
  HandleSetPref(args, TYPE_LIST);
}

void BitpopCoreOptionsHandler::HandleSetPref(const ListValue* args, PrefType type) {
  DCHECK_GT(static_cast<int>(args->GetSize()), 1);

  std::string pref_name;
  if (!args->GetString(0, &pref_name))
    return;

  const base::Value* value;
  if (!args->Get(1, &value))
    return;

  scoped_ptr<base::Value> temp_value;

  switch (type) {
    case TYPE_BOOLEAN:
      CHECK_EQ(base::Value::TYPE_BOOLEAN, value->GetType());
      break;
    case TYPE_INTEGER: {
      // In JS all numbers are doubles.
      double double_value;
      CHECK(value->GetAsDouble(&double_value));
      int int_value = static_cast<int>(double_value);
      temp_value.reset(new base::FundamentalValue(int_value));
      value = temp_value.get();
      break;
    }
    case TYPE_DOUBLE:
      CHECK_EQ(base::Value::TYPE_DOUBLE, value->GetType());
      break;
    case TYPE_STRING:
      CHECK_EQ(base::Value::TYPE_STRING, value->GetType());
      break;
    case TYPE_URL: {
      std::string original;
      CHECK(value->GetAsString(&original));
      GURL fixed = URLFixerUpper::FixupURL(original, std::string());
      temp_value.reset(new base::StringValue(fixed.spec()));
      value = temp_value.get();
      break;
    }
    case TYPE_LIST: {
      // In case we have a List pref we got a JSON string.
      std::string json_string;
      CHECK(value->GetAsString(&json_string));
      temp_value.reset(
          base::JSONReader::Read(json_string));
      value = temp_value.get();
      CHECK_EQ(base::Value::TYPE_LIST, value->GetType());
      break;
    }
    default:
      NOTREACHED();
  }

  std::string metric;
  if (args->GetSize() > 2 && !args->GetString(2, &metric))
    LOG(WARNING) << "Invalid metric parameter: " << pref_name;
  SetPref(pref_name, value, metric);
}

void BitpopCoreOptionsHandler::HandleClearPref(const ListValue* args) {
  DCHECK_GT(static_cast<int>(args->GetSize()), 0);

  std::string pref_name;
  if (!args->GetString(0, &pref_name))
    return;

  std::string metric;
  if (args->GetSize() > 1) {
    if (!args->GetString(1, &metric))
      NOTREACHED();
  }

  ClearPref(pref_name, metric);
}

void BitpopCoreOptionsHandler::HandleUserMetricsAction(const ListValue* args) {
  std::string metric = UTF16ToUTF8(ExtractStringValue(args));
  if (!metric.empty())
    content::RecordComputedAction(metric);
}

void BitpopCoreOptionsHandler::UpdateClearPluginLSOData() {
  //scoped_ptr<base::Value> enabled(
  //    base::Value::CreateBooleanValue(
  //        plugin_status_pref_setter_.IsClearPluginLSODataEnabled()));
  //web_ui()->CallJavascriptFunction(
  //    "OptionsPage.setClearPluginLSODataEnabled", *enabled);
}

void BitpopCoreOptionsHandler::UpdatePepperFlashSettingsEnabled() {
  //scoped_ptr<base::Value> enabled(
  //    base::Value::CreateBooleanValue(
  //        plugin_status_pref_setter_.IsPepperFlashSettingsEnabled()));
  //web_ui()->CallJavascriptFunction(
  //    "OptionsPage.setPepperFlashSettingsEnabled", *enabled);
}

}  // namespace options2
