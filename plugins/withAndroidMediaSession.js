const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// ── Java source ───────────────────────────────────────────────────────────────
//
// Three files mirroring the iOS NowPlayingModule pattern:
//   MediaPlaybackService  — Android Foreground Service (keeps process alive)
//   MediaPlaybackModule   — React Native bridge (exposes start/stop to JS)
//   MediaPlaybackPackage  — registers the module with React Native
//
// The Foreground Service is what keeps Android from killing the app process
// when the screen turns off, allowing the JS countdown + audio to keep running.

const SERVICE_SOURCE = `\
package PACKAGE_NAME;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

public class MediaPlaybackService extends Service {

    public static final String CHANNEL_ID  = "meditation_playback";
    public static final int NOTIFICATION_ID = 101;
    public static final String ACTION_START = "ACTION_START";
    public static final String ACTION_STOP  = "ACTION_STOP";
    public static final String EXTRA_TITLE  = "title";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }
        String title = (intent != null) ? intent.getStringExtra(EXTRA_TITLE) : null;
        if (title == null) title = "Meditation";
        Notification notification = buildNotification(title);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification,
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        return START_STICKY;
    }

    private Notification buildNotification(String title) {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText("Meditation in progress — tap to return")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .setSilent(true)
            .setOngoing(true)
            .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Meditation Playback",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps your meditation running with the screen off");
            channel.setShowBadge(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
`;

const MODULE_SOURCE = `\
package PACKAGE_NAME;

import android.content.Intent;
import android.os.Build;
import androidx.annotation.NonNull;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class MediaPlaybackModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;

    public MediaPlaybackModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @NonNull
    @Override
    public String getName() { return "MediaPlaybackModule"; }

    @ReactMethod
    public void startService(String title) {
        Intent intent = new Intent(reactContext, MediaPlaybackService.class);
        intent.setAction(MediaPlaybackService.ACTION_START);
        intent.putExtra(MediaPlaybackService.EXTRA_TITLE, title);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactContext.startForegroundService(intent);
        } else {
            reactContext.startService(intent);
        }
    }

    @ReactMethod
    public void stopService() {
        Intent intent = new Intent(reactContext, MediaPlaybackService.class);
        intent.setAction(MediaPlaybackService.ACTION_STOP);
        reactContext.startService(intent);
    }
}
`;

const PACKAGE_SOURCE = `\
package PACKAGE_NAME;

import androidx.annotation.NonNull;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class MediaPlaybackPackage implements ReactPackage {

    @NonNull
    @Override
    public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new MediaPlaybackModule(reactContext));
        return modules;
    }

    @NonNull
    @Override
    public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
`;

// ── Plugin ────────────────────────────────────────────────────────────────────

function withAndroidMediaSession(config) {
  const packageName = config.android?.package ?? 'com.amandaplanet.AbrahamHicksToolkit';

  // 1. Declare the service in AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application?.[0];
    if (!app) return config;
    if (!app.service) app.service = [];
    const alreadyAdded = app.service.some(
      (s) => s.$?.['android:name'] === '.MediaPlaybackService'
    );
    if (!alreadyAdded) {
      app.service.push({
        $: {
          'android:name': '.MediaPlaybackService',
          'android:foregroundServiceType': 'mediaPlayback',
          'android:exported': 'false',
        },
      });
    }
    return config;
  });

  // 2. Write the three Java source files
  config = withDangerousMod(config, [
    'android',
    (config) => {
      const srcDir = path.join(
        config.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'java',
        ...packageName.split('.')
      );
      fs.mkdirSync(srcDir, { recursive: true });

      const write = (filename, source) =>
        fs.writeFileSync(
          path.join(srcDir, filename),
          source.replace(/PACKAGE_NAME/g, packageName)
        );

      write('MediaPlaybackService.java', SERVICE_SOURCE);
      write('MediaPlaybackModule.java',  MODULE_SOURCE);
      write('MediaPlaybackPackage.java', PACKAGE_SOURCE);

      return config;
    },
  ]);

  // 3. Register the package in MainApplication.kt (or .java)
  config = withDangerousMod(config, [
    'android',
    (config) => {
      const srcDir = path.join(
        config.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'java',
        ...packageName.split('.')
      );
      const ktPath   = path.join(srcDir, 'MainApplication.kt');
      const javaPath = path.join(srcDir, 'MainApplication.java');
      const filePath = fs.existsSync(ktPath) ? ktPath : javaPath;
      if (!fs.existsSync(filePath)) return config;

      let contents = fs.readFileSync(filePath, 'utf8');
      if (contents.includes('MediaPlaybackPackage')) return config; // idempotent

      if (filePath.endsWith('.kt')) {
        // Add import before the first 'import com.facebook.react' line
        contents = contents.replace(
          /(import com\.facebook\.react)/,
          `import ${packageName}.MediaPlaybackPackage\n$1`
        );
        // Insert add() call inside the PackageList apply block, after the example comment
        contents = contents.replace(
          /(\/\/ add\(MyReactNativePackage\(\)\))/,
          `$1\n              add(MediaPlaybackPackage())`
        );
      } else {
        // Java fallback
        contents = contents.replace(
          /(import com\.facebook\.react\.ReactPackage;)/,
          `import ${packageName}.MediaPlaybackPackage;\n$1`
        );
        contents = contents.replace(
          /(\/\/ add\(new MyReactNativePackage\(\)\);)/,
          `$1\n              packages.add(new MediaPlaybackPackage());`
        );
      }

      fs.writeFileSync(filePath, contents);
      return config;
    },
  ]);

  return config;
}

module.exports = withAndroidMediaSession;
