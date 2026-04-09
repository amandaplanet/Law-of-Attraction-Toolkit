const { withXcodeProject, withEntitlementsPlist } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MODULE_SOURCE = `\
#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <HealthKit/HealthKit.h>

@interface HealthKitModule : NSObject <RCTBridgeModule>
@end

@implementation HealthKitModule

RCT_EXPORT_MODULE()

// startTimestamp and endTimestamp are milliseconds since epoch (Date.now())
RCT_EXPORT_METHOD(saveMindfulSession:(double)startTimestamp
                  endTimestamp:(double)endTimestamp
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  HKHealthStore *store = [[HKHealthStore alloc] init];
  HKCategoryType *mindfulType = [HKObjectType categoryTypeForIdentifier:HKCategoryTypeIdentifierMindfulSession];

  [store requestAuthorizationToShareTypes:[NSSet setWithObject:mindfulType]
                                readTypes:nil
                               completion:^(BOOL success, NSError *error) {
    if (!success || error) {
      reject(@"auth_failed", error.localizedDescription ?: @"HealthKit authorization failed", error);
      return;
    }

    NSDate *start = [NSDate dateWithTimeIntervalSince1970:startTimestamp / 1000.0];
    NSDate *end   = [NSDate dateWithTimeIntervalSince1970:endTimestamp / 1000.0];

    HKCategorySample *sample = [HKCategorySample
      categorySampleWithType:mindfulType
                       value:HKCategoryValueNotApplicable
                   startDate:start
                     endDate:end];

    [store saveObject:sample withCompletion:^(BOOL saved, NSError *saveError) {
      if (saved) {
        resolve(nil);
      } else {
        reject(@"save_failed", saveError.localizedDescription ?: @"Failed to save mindful session", saveError);
      }
    }];
  }];
}

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

@end
`;

function withHealthKitXcode(config) {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const projectName  = config.modRequest.projectName;
    const platformRoot = config.modRequest.platformProjectRoot;

    // Write the ObjC file into the Xcode source tree
    const destDir  = path.join(platformRoot, projectName);
    const destFile = path.join(destDir, 'HealthKitModule.m');
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(destFile, MODULE_SOURCE);

    // Add to Xcode project build phase (idempotent)
    const filePath = `${projectName}/HealthKitModule.m`;
    if (!xcodeProject.hasFile(filePath)) {
      const groupKey = xcodeProject.findPBXGroupKey({ name: projectName });
      xcodeProject.addSourceFile(filePath, {}, groupKey);
    }

    // Link HealthKit.framework if not already present
    const fileRefs = Object.values(xcodeProject.pbxFileReferenceSection());
    const hasHealthKit = fileRefs.some(
      (ref) => ref && ref.path === '"HealthKit.framework"'
    );
    if (!hasHealthKit) {
      xcodeProject.addFramework('HealthKit.framework');
    }

    return config;
  });
}

function withHealthKitEntitlements(config) {
  return withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.healthkit'] = true;
    if (!config.modResults['com.apple.developer.healthkit.access']) {
      config.modResults['com.apple.developer.healthkit.access'] = [];
    }
    return config;
  });
}

module.exports = function withHealthKit(config) {
  config = withHealthKitXcode(config);
  config = withHealthKitEntitlements(config);
  return config;
};
