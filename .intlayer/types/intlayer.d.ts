import "intlayer";
import _17ih1iu3n43 from './app.ts';
import _22p7qwdjag3 from './videoControls.ts';
import _rmz3fyk4vw from './videoplayer.ts';
import _fr3jqw0g8q from './videoTimeline.ts';

declare module 'intlayer' {
  interface __DictionaryRegistry {
    "app": typeof _17ih1iu3n43;
    "videoControls": typeof _22p7qwdjag3;
    "videoplayer": typeof _rmz3fyk4vw;
    "videoTimeline": typeof _fr3jqw0g8q;
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
