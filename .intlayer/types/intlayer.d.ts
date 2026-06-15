import "intlayer";
import _29vp6up4mkh from './app.ts';
import _1yo645ft7bu from './calibration.ts';
import _19pa4yefg51 from './videoControls.ts';
import _1ppbz68x8yy from './videoplayer.ts';
import _1ub7uiqe2k9 from './videoTimeline.ts';

declare module 'intlayer' {
  interface __DictionaryRegistry {
    "app": typeof _29vp6up4mkh;
    "calibration": typeof _1yo645ft7bu;
    "videoControls": typeof _19pa4yefg51;
    "videoplayer": typeof _1ppbz68x8yy;
    "videoTimeline": typeof _1ub7uiqe2k9;
  }

  interface __DeclaredLocalesRegistry {
    "en": 1;
    "ja": 1;
  }

  interface __RequiredLocalesRegistry {
    "en": 1;
    "ja": 1;
  }

  interface __SchemaRegistry {

  }

  interface __StrictModeRegistry { mode: 'inclusive' }

  interface __EditorRegistry { enabled : false } 
}
