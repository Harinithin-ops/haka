// WhatsApp and Gboard (Google Keyboard) Style Emoji and Sticker Data

export interface EmojiCategory {
  id: string;
  name: string;
  icon: string;
  emojis: string[];
}

export interface Sticker {
  id: string;
  name: string;
  category: 'whatsapp' | 'google';
  svgDataUrl: string;
}

// Curated categorized emojis for WhatsApp/Gboard style picker
export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    name: 'Smileys & People',
    icon: '😃',
    emojis: [
      '😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🫣','🤭','🤫','🫠','🤥','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','😵‍💫','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤠','🤡','👿','😈','💀','☠️','👻','👽','👾','🤖','👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','🫵','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💪'
    ]
  },
  {
    id: 'animals',
    name: 'Animals & Nature',
    icon: '🐱',
    emojis: [
      '🐱','🐶','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐵','🐔','🐧','🐦','🦆','🦅','🦉','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🕷️','🦂','🐢','🐍','🦎','🐙','🦑',' lobster','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐆','🐅','🐈','🐇','🐿️','🦔','🐾','🍓','🍒','🍎','🍉','🍑','🍊','🍋','🍍','🍌','🥑','🥦','🌽','🥕','🍁','🌻','🌸','🌹','🌲','🌴','🌵','🌊','🔥','✨','⭐','🌟','☁️','☀️','🌈','🌀'
    ]
  },
  {
    id: 'food',
    name: 'Food & Drink',
    icon: '🍕',
    emojis: [
      '🍕','🍔','🍟','🌭','🥪','🌮','🌯','🥙','🍳','🍲','🥣','🥗','🍿','🧈','🥞','🥫','🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍠','🍢','🍣','🍤','🍥','🍡','🥟','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🥧','🍫','🍬','🍭','🍮','🍯','🍼','🥛','☕','🍵','🍶','🍾','🍷','🍸','🍹','🍺','🍻','🥂','🥤'
    ]
  },
  {
    id: 'activities',
    name: 'Activities & Travel',
    icon: '⚽',
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🏓','🏸','🥅','🏒','🏹','🏄','🏊','🏋️','🚴','🏆','🥇','🥈','🥉','🏅','🎫','🎟️','🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚜','🏍️','🛵','🚲','🛴','skateboard','🚇','🚄','✈️','🚀','🛸','🎈','🎉','🎊','🎪','🎭','🎨','🎬','🎤','🎧'
    ]
  },
  {
    id: 'objects',
    name: 'Objects & Symbols',
    icon: '💡',
    emojis: [
      '💡','🔦','🕯️','📖','📕','📔','📘','✉️','📩','📦','✏️','✒️','📝','💼','📁','📅','📊','📋','📌','📎','🔒','🔓','🔑','🔨','🪓','🛠️','🛡️','🔧','⚙️','🩹','🩺','🧪','⚖️','📱','💻','🖥️','🖨️','⌨️','🖱️','📷','📺','📻','⏰','⏳','💎','💰','💳'
    ]
  },
  {
    id: 'hearts',
    name: 'Hearts & Symbols',
    icon: '❤️',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','💖','💗','💓','💞','💕','💟','❣️','💘','💝','🎴','🎵','🎶','🔔','🔕','📣','📢','💬','💭','💤','🌐','💢','💥','💫','💦','💨','💯','🔞','⚠️','🚫','⛔','💤','💮','🔆','♻️','❓','❌','⭕'
    ]
  }
];

// Flat list of emojis for search functionality
export const ALL_EMOJIS: { emoji: string; name: string; category: string }[] = EMOJI_CATEGORIES.flatMap(cat => 
  cat.emojis.map(e => ({
    emoji: e,
    name: getEmojiName(e),
    category: cat.id
  }))
);

function getEmojiName(emoji: string): string {
  // Simple mapping helper for keyword searches
  const names: Record<string, string> = {
    '😃': 'happy smile smileys', '😄': 'laugh grin happy smileys', '😁': 'grin happy smileys',
    '😆': 'laugh grin happy smileys', '😅': 'sweat smile happy smileys', '😂': 'joy tear laugh happy smileys',
    '🤣': 'rofl laugh smileys', '😊': 'blush happy smileys', '😇': 'angel halo smileys',
    '🙂': 'slight smile smileys', '🙃': 'upside smileys', '😉': 'wink smileys',
    '😌': 'relieved smileys', '😍': 'heart eyes love smileys', '🥰': 'hearts love happy smileys',
    '😘': 'kiss blow love smileys', '😋': 'delicious yum food tongue smileys', '😛': 'tongue smileys',
    '😜': 'wink tongue smileys', '🤪': 'crazy goofy smileys', '😎': 'cool sunglasses shades smileys',
    '🥳': 'party celebrate smileys', '🥺': 'pleading beg tear smileys', '😢': 'cry sad tear smileys',
    '😭': 'sob cry sad tear smileys', '😤': 'triumph angry smileys', '😠': 'angry mad smileys',
    '😡': 'rage angry mad smileys', '🤬': 'swear angry smileys', '🤯': 'mind blown explode smileys',
    '😳': 'blush surprise smileys', '🥵': 'hot red sweat smileys', '🥶': 'cold blue ice smileys',
    '😱': 'scream fear shock smileys', '🥱': 'yawn tired sleepy smileys', '😴': 'sleep tired zzz smileys',
    '🤮': 'vomit sick green smileys', '🤢': 'nausea sick green smileys', '👍': 'like thumbs up yes approve gestures',
    '👎': 'dislike thumbs down no gestures', '👏': 'clap praise gestures', '🙏': 'pray please thank hands gestures',
    '🐱': 'cat kitten animals', '🐶': 'dog puppy animals', '🦊': 'fox animals', '🐻': 'bear animals',
    '🐼': 'panda animals', '🦁': 'lion animals', '🐷': 'pig animals', '🐵': 'monkey animals',
    '🐱': 'cat animals', '🐶': 'dog animals', '🐯': 'tiger animals', '🐮': 'cow animals',
    '🐝': 'bee insect animals', '🦋': 'butterfly insect animals', '🕸️': 'web spider animals',
    '🍕': 'pizza food cheese pepperoni', '🍔': 'hamburger burger meat food', '🍟': 'fries chips potato food',
    '🌭': 'hotdog sausage food', '🥪': 'sandwich food', '🌮': 'taco food mex', '🍳': 'egg cook food',
    '🍩': 'donut sweet dessert food', '🍪': 'cookie sweet food', '🎂': 'cake birthday sweet food',
    '☕': 'coffee hot tea drink', '🍵': 'tea green drink', '🍺': 'beer alcohol drink', '🍻': 'beers drink toast',
    '⚽': 'soccer football ball sports', '🏀': 'basketball ball sports', '🏈': 'football sports',
    '🎾': 'tennis ball sports', '🏊': 'swim sports water', '🚴': 'bike cycling sports',
    '🏆': 'trophy gold win first', '✈️': 'plane flight travel', '🚀': 'rocket space ship blast',
    '🛸': 'ufo alien space ufo', '🎈': 'balloon party celebrate', '🎉': 'popper party celebrate',
    '💡': 'bulb light idea objects', '💻': 'laptop computer tech objects', '📷': 'camera photo objects',
    '💰': 'money cash dollar objects', '❤️': 'red heart love symbol', '💔': 'broken heart sad symbol',
    '💖': 'sparkle heart love symbol', '🔥': 'fire hot flame symbol', '✨': 'sparkles stars magic symbol',
    '⭐': 'star yellow symbol', '🌟': 'star shine symbol'
  };
  return names[emoji] || 'emoji';
}

// Hand-crafted high-definition sticker SVGs (WhatsApp and Gboard Blob style)
const blobHappySvg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="blobGrad" cx="40%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FFF59D" />
      <stop offset="70%" stop-color="#FBC02D" />
      <stop offset="100%" stop-color="#F57F17" />
    </radialGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.15" />
    </filter>
  </defs>
  <path d="M50 12 C28 12 18 30 18 55 C18 78 30 88 50 88 C70 88 82 78 82 55 C82 30 72 12 50 12 Z" fill="url(#blobGrad)" filter="url(#shadow)" stroke="#E65100" stroke-width="2.5"/>
  <circle cx="34" cy="55" r="7" fill="#FF8A80" opacity="0.6"/>
  <circle cx="66" cy="55" r="7" fill="#FF8A80" opacity="0.6"/>
  <ellipse cx="37" cy="44" rx="4" ry="5.5" fill="#37474F"/>
  <ellipse cx="63" cy="44" rx="4" ry="5.5" fill="#37474F"/>
  <circle cx="35.5" cy="42" r="1.5" fill="#FFFFFF"/>
  <circle cx="61.5" cy="42" r="1.5" fill="#FFFFFF"/>
  <path d="M40 60 Q50 72 60 60" stroke="#37474F" stroke-width="4" stroke-linecap="round" fill="none"/>
</svg>`;

const blobCoolSvg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="blobGrad" cx="40%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FFF59D" />
      <stop offset="70%" stop-color="#FBC02D" />
      <stop offset="100%" stop-color="#F57F17" />
    </radialGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.15" />
    </filter>
  </defs>
  <path d="M50 12 C28 12 18 30 18 55 C18 78 30 88 50 88 C70 88 82 78 82 55 C82 30 72 12 50 12 Z" fill="url(#blobGrad)" filter="url(#shadow)" stroke="#E65100" stroke-width="2.5"/>
  <path d="M22 41 L45 41 Q47 41 47 44 L42 53 Q40 56 35 56 L26 56 Q21 56 21 51 Z M53 41 L76 41 Q78 41 78 44 L73 53 Q71 56 66 56 L57 56 Q52 56 52 51 Z" fill="#263238" stroke="#37474F" stroke-width="1.5"/>
  <rect x="44" y="42" width="12" height="4" rx="1.5" fill="#263238"/>
  <path d="M30 43 L42 43" stroke="#FFFFFF" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
  <path d="M60 43 L72 43" stroke="#FFFFFF" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
  <path d="M38 65 Q50 74 62 65" stroke="#37474F" stroke-width="4.5" stroke-linecap="round" fill="none"/>
</svg>`;

const blobLoveSvg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="blobGrad" cx="40%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FFF59D" />
      <stop offset="70%" stop-color="#FBC02D" />
      <stop offset="100%" stop-color="#F57F17" />
    </radialGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.15" />
    </filter>
  </defs>
  <path d="M50 12 C28 12 18 30 18 55 C18 78 30 88 50 88 C70 88 82 78 82 55 C82 30 72 12 50 12 Z" fill="url(#blobGrad)" filter="url(#shadow)" stroke="#E65100" stroke-width="2.5"/>
  <path d="M32 45 C32 38 22 35 22 28 C22 20 28 16 34 22 C40 16 46 20 46 28 C46 35 36 38 32 45 Z" fill="#E53935" stroke="#B71C1C" stroke-width="1"/>
  <path d="M68 45 C68 38 58 35 58 28 C58 20 64 16 70 22 C76 16 82 20 82 28 C82 35 72 38 68 45 Z" fill="#E53935" stroke="#B71C1C" stroke-width="1"/>
  <path d="M50 78 C44 68 28 68 28 52 C28 40 38 32 50 44 C62 32 72 40 72 52 C72 68 56 78 50 78 Z" fill="#FF1744" stroke="#C2185B" stroke-width="2" filter="url(#shadow)"/>
  <path d="M40 50 C40 45 48 45 50 48 C52 45 60 45 60 50 C60 56 50 62 50 62 C50 62 40 56 40 50 Z" fill="#FFFFFF" opacity="0.3"/>
  <path d="M42 62 Q50 68 58 62" stroke="#37474F" stroke-width="3.5" stroke-linecap="round" fill="none"/>
</svg>`;

const whatsappCupcatSvg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.15" />
    </filter>
  </defs>
  <polygon points="32,32 24,10 40,24" fill="#FFA726" stroke="#FB8C00" stroke-width="2" stroke-linejoin="round"/>
  <polygon points="68,32 76,10 60,24" fill="#FFA726" stroke="#FB8C00" stroke-width="2" stroke-linejoin="round"/>
  <polygon points="32,32 28,16 38,26" fill="#FFCDD2"/>
  <polygon points="68,32 72,16 62,26" fill="#FFCDD2"/>
  <ellipse cx="50" cy="40" rx="22" ry="18" fill="#FFB74D" stroke="#FB8C00" stroke-width="2.5"/>
  <ellipse cx="42" cy="38" rx="2.5" ry="3.5" fill="#263238"/>
  <ellipse cx="58" cy="38" rx="2.5" ry="3.5" fill="#263238"/>
  <circle cx="40" cy="36" r="0.75" fill="#FFFFFF"/>
  <circle cx="56" cy="36" r="0.75" fill="#FFFFFF"/>
  <circle cx="36" cy="43" r="3.5" fill="#FF8A80" opacity="0.6"/>
  <circle cx="64" cy="43" r="3.5" fill="#FF8A80" opacity="0.6"/>
  <path d="M48 44 Q50 46 52 44" stroke="#263238" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M45 42 Q49 43 50 44 Q51 43 55 42" stroke="#263238" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M 23 54 L 77 54 L 70 90 A 8 8 0 0 1 62 97 L 38 97 A 8 8 0 0 1 30 90 Z" fill="#075E54" filter="url(#shadow)" stroke="#128C7E" stroke-width="2.5"/>
  <path d="M 74 62 C 84 62 84 82 74 82" fill="none" stroke="#128C7E" stroke-width="4.5" stroke-linecap="round"/>
  <rect x="20" y="50" width="60" height="6" rx="3" fill="#128C7E"/>
</svg>`;

const whatsappOnionSvg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.1" />
    </filter>
  </defs>
  <path d="M50 10 C24 45 18 60 18 75 C18 89 32 96 50 96 C68 96 82 89 82 75 C82 60 76 45 50 10" fill="#E1BEE7" stroke="#8E24AA" stroke-width="2.5" filter="url(#shadow)"/>
  <path d="M30 45 C35 30 50 15 50 15 M70 45 C65 30 50 15 50 15 M50 96 C50 60 50 30 50 10" stroke="#BA68C8" stroke-width="1.5" opacity="0.4" fill="none"/>
  <path d="M32 58 Q38 52 44 58 M56 58 Q62 52 68 58" stroke="#37474F" stroke-width="3" stroke-linecap="round" fill="none"/>
  <path d="M38 58 L38 72 C38 76 34 76 34 72 Z" fill="#29B6F6"/>
  <path d="M62 58 L62 72 C62 76 58 76 58 72 Z" fill="#29B6F6"/>
  <path d="M44 76 Q50 68 56 76" stroke="#37474F" stroke-width="3" stroke-linecap="round" fill="none"/>
  <circle cx="28" cy="65" r="4" fill="#FF8A80" opacity="0.4"/>
  <circle cx="72" cy="65" r="4" fill="#FF8A80" opacity="0.4"/>
</svg>`;

const whatsappHeartSvg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="4" flood-color="#000000" flood-opacity="0.2" />
    </filter>
    <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF5252" />
      <stop offset="100%" stop-color="#C2185B" />
    </linearGradient>
  </defs>
  <path d="M50 87 C40 77 15 62 15 37 C15 20 28 12 45 27 C50 32 50 32 50 32 C50 32 50 32 50 32 C50 32 50 32 55 27 C72 12 85 20 85 37 C85 62 60 77 50 87 Z" fill="url(#heartGrad)" filter="url(#shadow)" stroke="#880E4F" stroke-width="2"/>
  <path d="M22 32 C22 24 28 20 35 20 Q37 20 37 22 Q37 24 35 24 C30 24 26 28 26 33 Q26 35 24 35 Q22 35 22 32" fill="#FFFFFF" opacity="0.6"/>
</svg>`;

export const STICKERS: Sticker[] = [
  {
    id: 'google_blob_happy',
    name: 'Blob Happy',
    category: 'google',
    svgDataUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(blobHappySvg)
  },
  {
    id: 'google_blob_cool',
    name: 'Blob Cool',
    category: 'google',
    svgDataUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(blobCoolSvg)
  },
  {
    id: 'google_blob_love',
    name: 'Blob Love',
    category: 'google',
    svgDataUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(blobLoveSvg)
  },
  {
    id: 'whatsapp_cupcat',
    name: 'Coffee Cat',
    category: 'whatsapp',
    svgDataUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(whatsappCupcatSvg)
  },
  {
    id: 'whatsapp_onion',
    name: 'Sad Onion',
    category: 'whatsapp',
    svgDataUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(whatsappOnionSvg)
  },
  {
    id: 'whatsapp_heart',
    name: 'Glossy Heart',
    category: 'whatsapp',
    svgDataUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(whatsappHeartSvg)
  }
];
