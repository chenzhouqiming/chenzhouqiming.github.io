(function() {
  var MusicPlayer = {
    init: function() {
      // MetingJS auto-initializes via <meting-js> custom element
      // Handle APlayer instance if present
      this.waitForAPlayer();
    },

    waitForAPlayer: function() {
      var self = this;

      // APlayer is loaded via CDN and creates window.APlayer
      // The <meting-js> element handles initialization
      var checkInterval = setInterval(function() {
        var metingEl = document.querySelector('meting-js');
        if (metingEl && metingEl.aplayer) {
          clearInterval(checkInterval);
          self.onAPlayerReady(metingEl.aplayer);
        }
      }, 500);

      // Timeout after 10 seconds
      setTimeout(function() {
        clearInterval(checkInterval);
      }, 10000);
    },

    onAPlayerReady: function(ap) {
      // Store reference
      window.__aplayer = ap;

      // Force playlist and lyrics to fold/close on startup
      // Use a small delay to ensure APlayer has fully initialized DOM
      var self = this;
      setTimeout(function() {
        if (ap.lrc) {
          ap.lrc.hide();
        }
        if (ap.list) {
          ap.list.close();
        }
      }, 200);

      // Handle volume from settings
      var savedVolume = localStorage.getItem('musicVolume');
      if (savedVolume !== null) {
        ap.volume(parseFloat(savedVolume));
      }

      ap.on('volumechange', function() {
        localStorage.setItem('musicVolume', ap.audio.volume);
      });

      // Trim the playlist to keep the page light (API returns up to 1000 songs)
      var metingEl = document.querySelector('meting-js');
      var limit = parseInt(metingEl && metingEl.dataset ? metingEl.dataset.limit : '', 10);
      if (limit > 0) {
        this.trimPlaylist(ap, limit);
      }
    },

    // Wait until MetingJS has filled the list, then cut it down to `limit` tracks.
    trimPlaylist: function(ap, limit) {
      var last = -1;
      var stable = 0;
      var ticks = 0;
      var timer = setInterval(function() {
        ticks++;
        var n = ap.list && ap.list.audios ? ap.list.audios.length : 0;
        if (n > limit && n === last) {
          stable++;
        } else {
          stable = 0;
        }
        last = n;

        // List stopped growing (or we ran out of patience) -> trim once
        if ((n > limit && stable >= 2) || ticks > 60) {
          clearInterval(timer);
          MusicPlayer.applyLimit(ap, limit);
        }
      }, 300);
    },

    applyLimit: function(ap, limit) {
      var audios = ap.list && ap.list.audios;
      if (!audios || audios.length <= limit) return;
      var keep = audios.slice(0, limit);

      if (typeof ap.list.clear === 'function' && typeof ap.list.add === 'function') {
        ap.list.clear();
        ap.list.add(keep);
      } else {
        // Fallback: truncate the internal array in place
        ap.list.audios = keep;
      }

      // If the list panel was already rendered, refresh it
      if (ap.list && typeof ap.list.hide === 'function') {
        ap.list.hide();
      }
    }
  };

  window.MusicPlayer = MusicPlayer;
  document.addEventListener('DOMContentLoaded', function() {
    MusicPlayer.init();
  });
})();
