<?php

namespace Mundophpbb\Plugin\System\SociableMedia\Extension;

defined('_JEXEC') or die;

use Joomla\CMS\Plugin\CMSPlugin;
use Joomla\CMS\Uri\Uri;
use Joomla\Event\SubscriberInterface;

final class SociableMedia extends CMSPlugin implements SubscriberInterface
{
    protected $autoloadLanguage = true;

    public static function getSubscribedEvents(): array
    {
        return [
            'onAfterRender' => 'onAfterRender',
        ];
    }

    public function onAfterRender(): void
    {
        $app = $this->getApplication();

        if (!$app->isClient('site')) {
            return;
        }

        $identity = $app->getIdentity();
        if (!$identity || $identity->guest) {
            return;
        }

        $input = $app->getInput();
        if ($input->getCmd('option') !== 'com_sociable') {
            return;
        }

        $body = $app->getBody();
        if (!$body || stripos($body, '</body>') === false) {
            return;
        }

        if (strpos($body, 'data-sociablemedia-bootstrap="110"') !== false) {
            return;
        }

        $rating = (string) $this->params->get('giphy_rating', 'pg');
        if (!in_array($rating, ['g', 'pg', 'pg-13', 'r'], true)) {
            $rating = 'pg';
        }

        $options = [
            'enableEmoji' => (bool) $this->params->get('enable_emoji', 1),
            'enableGif' => (bool) $this->params->get('enable_gif', 1),
            'gifMaxHeight' => max(120, min(800, (int) $this->params->get('gif_max_height', 360))),
            'giphyApiKey' => trim((string) $this->params->get('giphy_api_key', '')),
            'giphyRating' => $rating,
            'giphyLimit' => max(8, min(30, (int) $this->params->get('giphy_limit', 20))),
            'giphyLang' => str_starts_with(strtolower((string) $app->getLanguage()->getTag()), 'pt') ? 'pt' : 'en',
            'strings' => [
                'emoji' => $app->getLanguage()->_('PLG_SYSTEM_SOCIABLEMEDIA_EMOJI'),
                'gif' => $app->getLanguage()->_('PLG_SYSTEM_SOCIABLEMEDIA_GIF'),
                'searchGifs' => $app->getLanguage()->_('PLG_SYSTEM_SOCIABLEMEDIA_SEARCH_GIFS'),
                'trending' => $app->getLanguage()->_('PLG_SYSTEM_SOCIABLEMEDIA_TRENDING'),
                'loading' => $app->getLanguage()->_('PLG_SYSTEM_SOCIABLEMEDIA_LOADING'),
                'noResults' => $app->getLanguage()->_('PLG_SYSTEM_SOCIABLEMEDIA_NO_RESULTS'),
                'gifError' => $app->getLanguage()->_('PLG_SYSTEM_SOCIABLEMEDIA_GIF_ERROR'),
                'giphyKeyMissing' => $app->getLanguage()->_('PLG_SYSTEM_SOCIABLEMEDIA_GIPHY_KEY_MISSING'),
                'gifUrl' => $app->getLanguage()->_('PLG_SYSTEM_SOCIABLEMEDIA_GIF_URL'),
                'gifPlaceholder' => $app->getLanguage()->_('PLG_SYSTEM_SOCIABLEMEDIA_GIF_PLACEHOLDER'),
                'insertGif' => $app->getLanguage()->_('PLG_SYSTEM_SOCIABLEMEDIA_INSERT_GIF'),
                'invalidGif' => $app->getLanguage()->_('PLG_SYSTEM_SOCIABLEMEDIA_INVALID_GIF'),
                'manualUrl' => $app->getLanguage()->_('PLG_SYSTEM_SOCIABLEMEDIA_MANUAL_URL'),
                'poweredByGiphy' => 'Powered by GIPHY',
            ],
        ];

        $json = json_encode($options, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
        $base = rtrim(Uri::root(true), '/');
        $css = $base . '/media/plg_system_sociablemedia/css/sociablemedia.css?v=110';
        $js = $base . '/media/plg_system_sociablemedia/js/sociablemedia-110.js?v=110';

        $injection = "\n<!-- Sociable Media 1.1.0 -->\n"
            . '<span data-sociablemedia-bootstrap="110" hidden></span>' . "\n"
            . '<link rel="stylesheet" href="' . htmlspecialchars($css, ENT_QUOTES, 'UTF-8') . '">' . "\n"
            . '<script>window.SociableMediaOptions=' . $json . ';</script>' . "\n"
            . '<script src="' . htmlspecialchars($js, ENT_QUOTES, 'UTF-8') . '"></script>' . "\n";

        $body = str_ireplace('</body>', $injection . '</body>', $body);
        $app->setBody($body);
    }
}
