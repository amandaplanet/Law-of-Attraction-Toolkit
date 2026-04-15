import * as fs from 'fs';
import * as path from 'path';

// Read the plugin source and extract the Objective-C string it will write.
// This lets us validate the generated native code without needing a macOS build.
const pluginSource = fs.readFileSync(
  path.resolve(__dirname, '../../plugins/withNowPlaying.js'),
  'utf8'
);

// Pull out everything between the MODULE_SOURCE backticks
const objcMatch = pluginSource.match(/const MODULE_SOURCE = `\\?\n?([\s\S]*?)`;/);
const objcSource = objcMatch?.[1] ?? '';

describe('withNowPlaying — generated Objective-C', () => {
  it('extracted source is non-empty', () => {
    expect(objcSource.length).toBeGreaterThan(100);
  });

  it('imports the MediaPlayer framework', () => {
    expect(objcSource).toContain('#import <MediaPlayer/MediaPlayer.h>');
  });

  it('activates AVAudioSession with Playback category', () => {
    expect(objcSource).toContain('AVAudioSessionCategoryPlayback');
    expect(objcSource).toContain('[session setActive:YES error:nil]');
  });

  it('registers MPRemoteCommandCenter play+pause handlers (required for lock screen widget)', () => {
    // Without these, iOS will not show the Now Playing widget regardless of
    // what is set in MPNowPlayingInfoCenter.
    expect(objcSource).toContain('MPRemoteCommandCenter');
    expect(objcSource).toContain('center.playCommand');
    expect(objcSource).toContain('center.pauseCommand');
    expect(objcSource).toContain('addTargetWithHandler');
    expect(objcSource).toContain('MPRemoteCommandHandlerStatusSuccess');
  });

  it('registers remote command handlers inside activateAudioSession', () => {
    // Handlers must be in activateAudioSession, not in setNowPlaying or clearNowPlaying
    const activateBody = objcSource.match(
      /RCT_EXPORT_METHOD\(activateAudioSession\)([\s\S]*?)(?=RCT_EXPORT_METHOD)/
    )?.[1] ?? '';
    expect(activateBody).toContain('MPRemoteCommandCenter');
    expect(activateBody).toContain('center.playCommand');
  });

  it('dispatches remote command registration on the main queue', () => {
    const activateBody = objcSource.match(
      /RCT_EXPORT_METHOD\(activateAudioSession\)([\s\S]*?)(?=RCT_EXPORT_METHOD)/
    )?.[1] ?? '';
    expect(activateBody).toContain('dispatch_async(dispatch_get_main_queue()');
    // MPRemoteCommandCenter must come after the dispatch_async call
    const dispatchIdx = activateBody.indexOf('dispatch_async(dispatch_get_main_queue()');
    const remoteIdx = activateBody.indexOf('MPRemoteCommandCenter');
    expect(remoteIdx).toBeGreaterThan(dispatchIdx);
  });

  it('sets nowPlayingInfo with required keys', () => {
    expect(objcSource).toContain('MPMediaItemPropertyTitle');
    expect(objcSource).toContain('MPMediaItemPropertyPlaybackDuration');
    expect(objcSource).toContain('MPNowPlayingInfoPropertyElapsedPlaybackTime');
    expect(objcSource).toContain('MPNowPlayingInfoPropertyPlaybackRate');
    expect(objcSource).toContain('[MPNowPlayingInfoCenter defaultCenter].nowPlayingInfo');
  });

  it('has balanced braces in the generated source', () => {
    const opens  = (objcSource.match(/\{/g) ?? []).length;
    const closes = (objcSource.match(/\}/g) ?? []).length;
    expect(opens).toBe(closes);
  });
});

describe('withNowPlaying — plugin configuration', () => {
  it('links MediaPlayer.framework', () => {
    expect(pluginSource).toContain("'MediaPlayer.framework'");
  });

  it('writes NowPlayingModule.m to the Xcode project', () => {
    expect(pluginSource).toContain("'NowPlayingModule.m'");
  });
});
