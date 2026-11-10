export interface EmojiSet {
  label: 'emojiSmileys' | 'emojiPeople' | 'emojiHearts' | 'emojiNature' | 'emojiFood' | 'emojiActivities' | 'emojiObjects' | 'emojiSymbols';
  emoji: string[];
}

const split = (list: string) => list.split(' ');

export const EMOJI_SETS: EmojiSet[] = [
  { label: 'emojiSmileys', emoji: split('😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 😮‍💨 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🥵 🥶 🥴 😵 🤯 🤠 🥳 🥸 😎 🤓 🧐 😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 💩 🤡 👻 👽 🤖') },
  { label: 'emojiPeople', emoji: split('👋 🤚 🖐 ✋ 🖖 👌 🤌 🤏 ✌ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍ 💅 🤳 💪 🦾 🧠 👀 👁 👅 👄 💋 👶 🧒 👦 👧 🧑 👨 👩 🧓 👴 👵 🙋 🙆 🙅 🤷 🤦 💁 🙇') },
  { label: 'emojiHearts', emoji: split('❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟') },
  { label: 'emojiNature', emoji: split('🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🐺 🐴 🦄 🐝 🦋 🐌 🐞 🐢 🐍 🐙 🦀 🐠 🐬 🐳 🦈 🌵 🌲 🌳 🌴 🌱 🌿 🍀 🍁 🍂 🌷 🌹 🌻 🌸 🌼 🌞 🌝 🌙 ⭐ 🌟 ⚡ 🔥 🌈 ☀️ ⛅ 🌧 ❄️ ☃️ 🌊') },
  { label: 'emojiFood', emoji: split('🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🥦 🥕 🌽 🌶 🥔 🥐 🍞 🧀 🥚 🍳 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🥗 🍝 🍜 🍣 🍱 🍤 🍦 🍩 🍪 🎂 🍰 🧁 🍫 🍬 🍭 ☕ 🍵 🧃 🥤 🍺 🍻 🥂 🍷 🍸') },
  { label: 'emojiActivities', emoji: split('⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🏸 🥅 ⛳ 🏹 🎣 🥊 🥋 ⛸ 🎿 🏂 🏋️ 🚴 🏊 🏆 🥇 🥈 🥉 🏅 🎗 🎟 🎫 🎭 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🎻 🎲 🎯 🎳 🎮 🧩') },
  { label: 'emojiObjects', emoji: split('⌚ 📱 💻 ⌨ 🖥 🖨 🖱 💾 📷 📸 📹 🎥 📞 ☎ 📺 📻 ⏰ ⌛ 💡 🔦 🕯 💸 💵 💰 💳 💎 ⚖ 🔧 🔨 🛠 🔑 🗝 🔒 🔓 🚪 🛏 🛁 🎁 🎈 🎉 🎊 ✉ 📦 📝 📚 📖 ✏️ 📌 📎 ✂️ 🗑 🚗 🚕 🚌 🚲 ✈️ 🚀 🏠 🏢 ⛺ 🌍') },
  { label: 'emojiSymbols', emoji: split('✅ ☑️ ✔️ ❌ ❎ ➕ ➖ ➗ ✖️ ❓ ❔ ❗ ❕ ‼️ ⁉️ 💯 🔞 📵 🚫 ⛔ ⭕ 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🔶 🔷 🔸 🔹 ▶️ ⏸ ⏹ ⏺ ⏭ ⏮ 🔀 🔁 🔂 🔔 🔕 🎵 🎶 💤 💬 💭 🗯 ♻️ ⚠️ 🆗 🆕 🆒 🆓 🔝 🔜') },
];
