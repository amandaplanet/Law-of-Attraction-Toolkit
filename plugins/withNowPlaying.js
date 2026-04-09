const { withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Single Objective-C file — no bridging header needed, no Swift/ObjC interop.
// RCT_EXPORT_MODULE() registers it with the React Native legacy bridge, which
// still works under New Architecture via the interop compatibility layer.
const MODULE_SOURCE = `\
#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <MediaPlayer/MediaPlayer.h>
#import <AVFoundation/AVFoundation.h>

@interface NowPlayingModule : NSObject <RCTBridgeModule>
@end

@implementation NowPlayingModule

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(activateAudioSession) {
  AVAudioSession *session = [AVAudioSession sharedInstance];
  [session setCategory:AVAudioSessionCategoryPlayback error:nil];
  [session setActive:YES error:nil];
}

RCT_EXPORT_METHOD(setNowPlaying:(NSDictionary *)info) {
  NSString *title    = info[@"title"]    ?: @"Meditation";
  NSNumber *elapsed  = info[@"elapsed"]  ?: @0;
  NSNumber *duration = info[@"duration"] ?: @900;
  NSNumber *rate     = info[@"rate"]     ?: @1.0;

  NSMutableDictionary *nowPlayingInfo = [NSMutableDictionary dictionary];
  nowPlayingInfo[MPMediaItemPropertyTitle]                    = title;
  nowPlayingInfo[MPMediaItemPropertyArtist]                   = @"Abraham-Hicks Toolkit";
  nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsed;
  nowPlayingInfo[MPMediaItemPropertyPlaybackDuration]         = duration;
  nowPlayingInfo[MPNowPlayingInfoPropertyPlaybackRate]        = rate;

  dispatch_async(dispatch_get_main_queue(), ^{
    [MPNowPlayingInfoCenter defaultCenter].nowPlayingInfo = nowPlayingInfo;
  });
}

RCT_EXPORT_METHOD(clearNowPlaying) {
  dispatch_async(dispatch_get_main_queue(), ^{
    [MPNowPlayingInfoCenter defaultCenter].nowPlayingInfo = nil;
  });
}

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

@end
`;

module.exports = function withNowPlaying(config) {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const projectName  = config.modRequest.projectName;
    const platformRoot = config.modRequest.platformProjectRoot;

    // Write the ObjC file into the Xcode source tree
    const destDir  = path.join(platformRoot, projectName);
    const destFile = path.join(destDir, 'NowPlayingModule.m');
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(destFile, MODULE_SOURCE);

    // Add to Xcode project build phase (idempotent)
    const filePath = `${projectName}/NowPlayingModule.m`;
    if (!xcodeProject.hasFile(filePath)) {
      const groupKey = xcodeProject.findPBXGroupKey({ name: projectName });
      xcodeProject.addSourceFile(filePath, {}, groupKey);
    }

    // Link MediaPlayer.framework if not already present
    const fileRefs = Object.values(xcodeProject.pbxFileReferenceSection());
    const hasMediaPlayer = fileRefs.some(
      (ref) => ref && ref.path === '"MediaPlayer.framework"'
    );
    if (!hasMediaPlayer) {
      xcodeProject.addFramework('MediaPlayer.framework');
    }

    return config;
  });
};
