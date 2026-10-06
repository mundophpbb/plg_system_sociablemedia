(function () {
    'use strict';

    var options = window.SociableMediaOptions || {};
    if (typeof options.enableEmoji === 'undefined') options.enableEmoji = true;
    if (typeof options.enableGif === 'undefined') options.enableGif = true;
    options.strings = options.strings || {};
    if (!options.enableEmoji && !options.enableGif) return;

    var strings = options.strings;
    var panel = null;
    var scanTimer = null;
    var gifRequestController = null;
    var gifSearchTimer = null;

    var emojiGroups = [
        ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😍','🥰','😘','😋','😎','🤩','🥳','😏','😢','😭','😡','🤬','🤔','🤗','🤭','🫢','🫡'],
        ['👍','👎','👌','✌️','🤞','🤟','🤘','👏','🙌','🫶','🙏','💪','👀','🧠','❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','❣️','💕','💯'],
        ['🎉','🎊','✨','🔥','⭐','🌟','💥','💫','✅','❌','⚠️','🚀','🏆','🥇','🎯','💡','📌','📣','🔔','💬','📝','📸','🎬','🎵','☕','🍻'],
        ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐸','🐵','🌞','🌙','🌈','🌹','🌻','🍀','🌎','⚽','🏀','🏎️','✈️','🚗','🏠']
    ];

    function normalize(value) {
        var s = String(value || '').toLowerCase().trim();
        try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
        return s.replace(/\s+/g, ' ');
    }

    function nativeSetValue(field, value) {
        if (!field) return;
        var proto = field.tagName === 'INPUT' ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
        var descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
        if (descriptor && descriptor.set) descriptor.set.call(field, value);
        else field.value = value;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function insertText(field, text) {
        if (!field || !document.contains(field)) return;
        var current = field.value || '';
        var start = field.selectionStart != null ? field.selectionStart : current.length;
        var end = field.selectionEnd != null ? field.selectionEnd : start;
        nativeSetValue(field, current.slice(0, start) + text + current.slice(end));
        field.focus();
        var pos = start + text.length;
        if (typeof field.setSelectionRange === 'function') {
            try { field.setSelectionRange(pos, pos); } catch (e) {}
        }
    }

    function insertGifUrl(field, url) {
        var prefix = field.value && !/\s$/.test(field.value) ? '\n' : '';
        insertText(field, prefix + url + '\n');
        closePanel();
    }

    function closePanel() {
        if (gifRequestController) {
            try { gifRequestController.abort(); } catch (e) {}
            gifRequestController = null;
        }
        if (gifSearchTimer) {
            clearTimeout(gifSearchTimer);
            gifSearchTimer = null;
        }
        if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
        panel = null;
    }

    function positionPanel(anchor, preferredWidth) {
        if (!panel || !anchor) return;
        var rect = anchor.getBoundingClientRect();
        var width = Math.min(preferredWidth || 360, window.innerWidth - 16);
        var left = rect.left + window.scrollX;
        if (left + width > window.scrollX + window.innerWidth - 8) {
            left = window.scrollX + window.innerWidth - width - 8;
        }
        panel.style.width = width + 'px';
        panel.style.left = Math.max(window.scrollX + 8, left) + 'px';
        panel.style.top = (rect.bottom + window.scrollY + 6) + 'px';
    }

    function makeCloseButton() {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'sociable-media-panel-close';
        b.setAttribute('aria-label', 'Close');
        b.innerHTML = '&times;';
        b.addEventListener('click', closePanel);
        return b;
    }

    function openEmoji(field, anchor) {
        closePanel();
        panel = document.createElement('div');
        panel.className = 'sociable-media-panel sociable-media-emoji-panel';
        panel.appendChild(makeCloseButton());

        emojiGroups.forEach(function (group) {
            var row = document.createElement('div');
            row.className = 'sociable-media-emoji-grid';
            group.forEach(function (emoji) {
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'sociable-media-emoji';
                b.textContent = emoji;
                b.addEventListener('mousedown', function (e) { e.preventDefault(); });
                b.addEventListener('click', function (e) {
                    e.preventDefault();
                    insertText(field, emoji);
                });
                row.appendChild(b);
            });
            panel.appendChild(row);
        });
        document.body.appendChild(panel);
        positionPanel(anchor, 360);
    }

    function validGif(value) {
        try {
            var u = new URL(value);
            if (u.protocol !== 'https:') return false;
            return /\.gif(?:$|[?#])/i.test(u.pathname + u.search) ||
                /(^|\.)media\d*\.giphy\.com$/i.test(u.hostname) ||
                /(^|\.)i\.giphy\.com$/i.test(u.hostname) ||
                /(^|\.)media\.tenor\.com$/i.test(u.hostname) ||
                /(^|\.)c\.tenor\.com$/i.test(u.hostname);
        } catch (e) { return false; }
    }

    function addManualUrlBox(container, field) {
        var details = document.createElement('details');
        details.className = 'sociable-media-manual';
        var summary = document.createElement('summary');
        summary.textContent = strings.manualUrl || 'Insert by URL';
        details.appendChild(summary);

        var row = document.createElement('div');
        row.className = 'sociable-media-manual-row';
        var input = document.createElement('input');
        input.type = 'url';
        input.className = 'sociable-media-input';
        input.placeholder = strings.gifPlaceholder || 'Paste a direct HTTPS GIF URL...';
        var insert = document.createElement('button');
        insert.type = 'button';
        insert.className = 'sociable-media-insert';
        insert.textContent = strings.insertGif || 'Insert GIF';
        var error = document.createElement('div');
        error.className = 'sociable-media-error';
        error.hidden = true;
        insert.addEventListener('click', function () {
            var url = input.value.trim();
            if (!validGif(url)) {
                error.textContent = strings.invalidGif || 'Please enter a valid direct HTTPS GIF URL.';
                error.hidden = false;
                return;
            }
            insertGifUrl(field, url);
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); insert.click(); }
        });
        row.appendChild(input);
        row.appendChild(insert);
        details.appendChild(row);
        details.appendChild(error);
        container.appendChild(details);
        return details;
    }

    function setGifStatus(status, text) {
        if (!status) return;
        status.textContent = text || '';
        status.hidden = !text;
    }

    function pickGifUrl(item) {
        if (!item || !item.images) return '';
        var image = item.images.original || item.images.fixed_height || item.images.fixed_width;
        return image && image.url ? image.url : '';
    }

    function pickGifPreview(item) {
        if (!item || !item.images) return '';
        var image = item.images.fixed_width_small || item.images.fixed_width || item.images.downsized_medium || item.images.original;
        return image && image.url ? image.url : '';
    }

    function renderGifResults(grid, status, data, field) {
        grid.innerHTML = '';
        var items = data && Array.isArray(data.data) ? data.data : [];
        if (!items.length) {
            setGifStatus(status, strings.noResults || 'No GIFs found.');
            return;
        }
        setGifStatus(status, '');
        items.forEach(function (item) {
            var url = pickGifUrl(item);
            var preview = pickGifPreview(item);
            if (!url || !preview) return;

            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'sociable-media-gif-tile';
            button.title = item.title || 'GIF';
            button.setAttribute('aria-label', item.title || 'GIF');
            var img = document.createElement('img');
            img.loading = 'lazy';
            img.src = preview;
            img.alt = item.title || 'GIF';
            button.appendChild(img);
            button.addEventListener('click', function () { insertGifUrl(field, url); });
            grid.appendChild(button);
        });
    }

    function loadGiphy(query, grid, status, field) {
        var key = String(options.giphyApiKey || '').trim();
        if (!key) {
            grid.innerHTML = '';
            setGifStatus(status, strings.giphyKeyMissing || 'Configure the GIPHY API key in the plugin to enable search.');
            return;
        }

        if (gifRequestController) {
            try { gifRequestController.abort(); } catch (e) {}
        }
        gifRequestController = typeof AbortController !== 'undefined' ? new AbortController() : null;

        grid.innerHTML = '';
        setGifStatus(status, strings.loading || 'Loading GIFs...');

        var endpoint = query ? 'https://api.giphy.com/v1/gifs/search' : 'https://api.giphy.com/v1/gifs/trending';
        var params = new URLSearchParams();
        params.set('api_key', key);
        params.set('limit', String(options.giphyLimit || 20));
        params.set('rating', options.giphyRating || 'pg');
        if (query) {
            params.set('q', query.slice(0, 50));
            params.set('lang', options.giphyLang || 'en');
        }

        var fetchOptions = gifRequestController ? { signal: gifRequestController.signal } : {};
        fetch(endpoint + '?' + params.toString(), fetchOptions)
            .then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(function (data) { renderGifResults(grid, status, data, field); })
            .catch(function (error) {
                if (error && error.name === 'AbortError') return;
                setGifStatus(status, strings.gifError || 'GIFs could not be loaded. Please try again.');
            });
    }

    function openGif(field, anchor) {
        closePanel();
        panel = document.createElement('div');
        panel.className = 'sociable-media-panel sociable-media-gif-browser';
        panel.appendChild(makeCloseButton());

        var search = document.createElement('input');
        search.type = 'search';
        search.className = 'sociable-media-input sociable-media-search';
        search.placeholder = strings.searchGifs || 'Search GIFs...';
        search.autocomplete = 'off';

        var status = document.createElement('div');
        status.className = 'sociable-media-gif-status';
        status.hidden = true;

        var grid = document.createElement('div');
        grid.className = 'sociable-media-gif-grid';

        var attribution = document.createElement('div');
        attribution.className = 'sociable-media-giphy-attribution';
        attribution.textContent = strings.poweredByGiphy || 'Powered by GIPHY';

        panel.appendChild(search);
        panel.appendChild(status);
        panel.appendChild(grid);
        panel.appendChild(attribution);
        addManualUrlBox(panel, field);
        document.body.appendChild(panel);
        positionPanel(anchor, 430);

        search.addEventListener('input', function () {
            if (gifSearchTimer) clearTimeout(gifSearchTimer);
            gifSearchTimer = setTimeout(function () {
                loadGiphy(search.value.trim(), grid, status, field);
            }, 350);
        });
        search.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (gifSearchTimer) clearTimeout(gifSearchTimer);
                loadGiphy(search.value.trim(), grid, status, field);
            }
        });

        loadGiphy('', grid, status, field);
        setTimeout(function () { search.focus(); }, 0);
    }

    function mediaKind(button) {
        if (!button || button.tagName !== 'BUTTON') return '';
        var t = normalize(button.textContent || button.getAttribute('aria-label') || button.title);
        if (/^(photo|foto)$/.test(t) || /\b(photo|foto)\b/.test(t)) return 'photo';
        if (/^(video)$/.test(t) || /\bvideo\b/.test(t)) return 'video';
        if (/^(event|evento)$/.test(t) || /\b(event|evento)\b/.test(t)) return 'event';
        return '';
    }

    function looksLikePostField(field) {
        if (!field || field.tagName !== 'TEXTAREA') return false;
        var ph = normalize(field.getAttribute('placeholder'));
        if (/mind|pensando|publique|publica|compartilhe|share/.test(ph)) return true;
        var rows = parseInt(field.getAttribute('rows') || '0', 10);
        return rows >= 2;
    }

    function looksLikeCommentField(field) {
        if (!field) return false;
        var tag = field.tagName;
        if (tag !== 'TEXTAREA' && tag !== 'INPUT') return false;
        if (tag === 'INPUT' && field.type && field.type !== 'text') return false;
        var ph = normalize(field.getAttribute('placeholder'));
        return /comment|reply|coment|respost|write a comment|add a comment/.test(ph);
    }

    function findCardFromGroup(group) {
        var node = group;
        for (var i = 0; node && i < 10; i++, node = node.parentElement) {
            if (!node.querySelector) continue;
            if (node.querySelector('textarea') || node.querySelector('input[type="file"]')) return node;
        }
        return group.parentElement;
    }

    function findPostField(card) {
        if (!card) return null;
        var fields = card.querySelectorAll('textarea');
        for (var i = 0; i < fields.length; i++) {
            if (looksLikePostField(fields[i])) return fields[i];
        }
        return fields.length === 1 ? fields[0] : null;
    }

    function expandComposer(card, done) {
        var field = findPostField(card);
        if (field) { done(field); return; }

        var buttons = card ? card.querySelectorAll('button') : [];
        var opener = null;
        for (var i = 0; i < buttons.length; i++) {
            var t = normalize(buttons[i].textContent);
            var ph = normalize(buttons[i].getAttribute('aria-label'));
            if (/mind|pensando|publique|publica|compartilhe/.test(t + ' ' + ph)) {
                opener = buttons[i]; break;
            }
        }
        if (!opener && card) {
            var candidate = card.querySelector('button.w-full, button[class*="w-full"]');
            if (candidate) opener = candidate;
        }
        if (!opener) return;

        opener.click();
        var tries = 0;
        var timer = setInterval(function () {
            var f = findPostField(card);
            tries++;
            if (f || tries > 20) {
                clearInterval(timer);
                if (f) done(f);
            }
        }, 60);
    }

    function iconSvg(type) {
        if (type === 'emoji') {
            return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/><path d="M8 14.5c1.1 1.4 2.4 2.1 4 2.1s2.9-.7 4-2.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
        }
        return '<svg viewBox="0 0 28 20" aria-hidden="true"><rect x="1" y="1" width="26" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="1.7"/><text x="14" y="13.3" text-anchor="middle" font-size="8" font-weight="800" fill="currentColor" font-family="Arial, sans-serif">GIF</text></svg>';
    }

    function createActionButton(type) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'sociable-media-native-btn sociable-media-icon-btn';
        b.dataset.sociableMediaAction = type;
        b.title = type === 'emoji' ? (strings.emoji || 'Emoji') : (strings.gif || 'GIF');
        b.setAttribute('aria-label', b.title);
        b.innerHTML = iconSvg(type);
        return b;
    }

    function mountPostGroup(group) {
        if (!group || group.nodeType !== 1) return;
        if (group.querySelector('.sociable-media-native-wrap')) return;

        var nativeButtons = Array.prototype.filter.call(group.children, function (child) {
            return child.tagName === 'BUTTON' && !!mediaKind(child);
        });
        if (nativeButtons.length < 2) return;

        var card = findCardFromGroup(group);
        if (!card) return;

        var wrap = document.createElement('span');
        wrap.className = 'sociable-media-native-wrap';

        if (options.enableEmoji) {
            var eb = createActionButton('emoji');
            eb.addEventListener('click', function (e) {
                e.preventDefault(); e.stopPropagation();
                expandComposer(card, function (field) { openEmoji(field, eb); });
            });
            wrap.appendChild(eb);
        }
        if (options.enableGif) {
            var gb = createActionButton('gif');
            gb.addEventListener('click', function (e) {
                e.preventDefault(); e.stopPropagation();
                expandComposer(card, function (field) { openGif(field, gb); });
            });
            wrap.appendChild(gb);
        }

        var last = nativeButtons[nativeButtons.length - 1];
        if (last.nextSibling) group.insertBefore(wrap, last.nextSibling);
        else group.appendChild(wrap);
    }

    function mountCommentField(field) {
        if (!looksLikeCommentField(field)) return;
        var host = field.parentElement;
        if (!host || host.querySelector('.sociable-media-comment-tools')) return;

        var wrap = document.createElement('span');
        wrap.className = 'sociable-media-comment-tools';

        if (options.enableEmoji) {
            var eb = createActionButton('emoji');
            eb.className = 'sociable-media-comment-btn sociable-media-icon-btn';
            eb.addEventListener('mousedown', function (e) { e.preventDefault(); });
            eb.addEventListener('click', function (e) { e.preventDefault(); openEmoji(field, eb); });
            wrap.appendChild(eb);
        }
        if (options.enableGif) {
            var gb = createActionButton('gif');
            gb.className = 'sociable-media-comment-btn sociable-media-icon-btn';
            gb.addEventListener('mousedown', function (e) { e.preventDefault(); });
            gb.addEventListener('click', function (e) { e.preventDefault(); openGif(field, gb); });
            wrap.appendChild(gb);
        }
        host.insertBefore(wrap, field.nextSibling);
    }

    function scan(root) {
        scanTimer = null;
        var scope = root && root.querySelectorAll ? root : document;
        var candidateGroups = [];
        scope.querySelectorAll('button').forEach(function (button) {
            if (!mediaKind(button) || !button.parentElement) return;
            if (candidateGroups.indexOf(button.parentElement) === -1) candidateGroups.push(button.parentElement);
        });
        candidateGroups.forEach(mountPostGroup);
        scope.querySelectorAll('textarea, input[type="text"]').forEach(mountCommentField);
    }

    function scheduleScan() {
        if (scanTimer) return;
        scanTimer = setTimeout(function () { scan(document); }, 30);
    }

    document.addEventListener('click', function (e) {
        if (panel && !panel.contains(e.target) && !e.target.closest('.sociable-media-native-wrap, .sociable-media-comment-tools')) closePanel();
        scheduleScan();
    }, true);
    document.addEventListener('focusin', scheduleScan, true);
    window.addEventListener('resize', closePanel);
    window.addEventListener('scroll', function (e) {
        if (panel && e.target === document) closePanel();
    }, true);

    function start() {
        try { console.info('[Sociable Media] 1.1.0 loaded'); } catch (e) {}
        document.documentElement.setAttribute('data-sociablemedia-loaded', '110');
        scan(document);
        var observer = new MutationObserver(scheduleScan);
        observer.observe(document.body, { childList: true, subtree: true });
        [150, 500, 1200, 2500, 5000].forEach(function (delay) { setTimeout(scheduleScan, delay); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
