// Netlify runs this automatically after every verified form submission
// (spam caught by the honeypot never reaches it) and forwards it to Discord.
//
// Netlify environment variables:
//   DISCORD_WEBHOOK_URL          required, channel for applications (and reviews by default)
//   DISCORD_REVIEWS_WEBHOOK_URL  optional, send reviews to a separate channel

const RED = 0xdf3324;

const clip = (value, max) => {
  const text = String(value ?? '').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const field = (name, value, inline = true) => {
  const text = clip(value, 1024);
  return text ? { name, value: text, inline } : null;
};

// File inputs arrive as an object ({ url, filename, ... }) or a bare URL string.
const fileUrl = (value) => (typeof value === 'string' ? value : value?.url) || '';

// wa.me wants the full international number as bare digits, without the local leading 0
const whatsapp = (code, number) => {
  const shown = [code, number].map((part) => String(part ?? '').trim()).filter(Boolean).join(' ');
  const local = String(number ?? '').replace(/\D/g, '').replace(/^0+/, '');
  if (!local) return shown;
  return `[${shown}](https://wa.me/${String(code ?? '').replace(/\D/g, '')}${local})`;
};

const application = (data) => ({
  title: `New application: ${clip(data.name, 200) || 'Unnamed'}`,
  color: RED,
  fields: [
    field('Discord', data.discord),
    field('WhatsApp', whatsapp(data.whatsapp_code, data.whatsapp)),
    field('Email', data.email),
    field('Country', data.country),
    field('Experience', data.experience),
    field('Market', data.market),
    field('Main challenge', data.challenge),
    field('Budget', data.investment),
    field('Found us via', data.source),
    field('What they want to improve', data.why, false)
  ].filter(Boolean)
});

const review = (data) => {
  const rating = Number(data.rating) || 0;
  const photos = ['photo1', 'photo2', 'photo3'].map((key) => fileUrl(data[key])).filter(Boolean);
  return {
    title: `New review: ${clip(data.name, 200) || 'Unnamed'}`,
    color: RED,
    description: clip(data.review, 4000),
    fields: [
      field('Rating', rating ? `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}` : ''),
      field('Time in mentorship', data.duration),
      field('Email', data.email),
      field('OK to publish', data.permission === 'yes' ? 'Yes' : 'No'),
      field('Photos', photos.map((url, i) => `[Photo ${i + 1}](${url})`).join('\n'), false)
    ].filter(Boolean),
    image: photos[0] ? { url: photos[0] } : undefined
  };
};

const builders = { 'mentorship-application': application, 'student-review': review };

exports.handler = async (event) => {
  const { payload } = JSON.parse(event.body || '{}');
  const build = builders[payload?.form_name];
  if (!build) return { statusCode: 200, body: 'Ignored form' };

  const webhook = (payload.form_name === 'student-review' && process.env.DISCORD_REVIEWS_WEBHOOK_URL)
    || process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    console.error('DISCORD_WEBHOOK_URL is not set');
    return { statusCode: 500, body: 'Discord webhook not configured' };
  }

  const embed = { ...build(payload.data || {}), timestamp: payload.created_at || new Date().toISOString() };
  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'ZTRADEZ Forms', allowed_mentions: { parse: [] }, embeds: [embed] })
  });
  if (!response.ok) {
    console.error(`Discord responded ${response.status}: ${await response.text()}`);
    return { statusCode: 502, body: 'Discord rejected the message' };
  }
  return { statusCode: 200, body: 'Sent to Discord' };
};
