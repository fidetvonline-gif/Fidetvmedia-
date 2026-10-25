// Client-safe content-specific thematic imagery
// Guaranteed varied and distinctive images based on context & deterministic title hashing

const CLIENT_THEME_IMAGES: Record<string, string[]> = {
  nigeria_politics: [
    'https://images.unsplash.com/photo-1541872703-74c5e44368f9?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1577495508048-b635879837f1?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1575320181282-9afab399332c?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1521791136064-7986c2920216?q=85&w=1600&auto=format&fit=crop'
  ],
  security_justice: [
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1453733197669-7928d11c7fa1?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1479142506502-19b3a3b7ff33?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1505664194779-8beaceb93744?q=85&w=1600&auto=format&fit=crop'
  ],
  economy_business: [
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=85&w=1600&auto=format&fit=crop'
  ],
  sports_football: [
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=85&w=1600&auto=format&fit=crop'
  ],
  technology_ai: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=85&w=1600&auto=format&fit=crop'
  ],
  health_science: [
    'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=85&w=1600&auto=format&fit=crop'
  ],
  broadcasting_media: [
    'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=85&w=1600&auto=format&fit=crop'
  ],
  education_youth: [
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=85&w=1600&auto=format&fit=crop'
  ],
  entertainment_culture: [
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?q=85&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=85&w=1600&auto=format&fit=crop'
  ]
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getClientContentImage(title: string = '', category: string = ''): string {
  const combined = `${title} ${category}`.toLowerCase();
  let theme = 'broadcasting_media';

  if (
    combined.includes('court') ||
    combined.includes('judge') ||
    combined.includes('police') ||
    combined.includes('efcc') ||
    combined.includes('arrest') ||
    combined.includes('law') ||
    combined.includes('justice') ||
    combined.includes('security') ||
    combined.includes('gunmen') ||
    combined.includes('bandits') ||
    combined.includes('kidnap') ||
    combined.includes('appeal')
  ) {
    theme = 'security_justice';
  } else if (
    combined.includes('tinubu') ||
    combined.includes('atiku') ||
    combined.includes('election') ||
    combined.includes('senate') ||
    combined.includes('governor') ||
    combined.includes('minister') ||
    combined.includes('niger delta') ||
    combined.includes('politics') ||
    combined.includes('government') ||
    combined.includes('fct') ||
    combined.includes('abiodun') ||
    combined.includes('ancestral') ||
    combined.includes('lands') ||
    combined.includes('communities') ||
    combined.includes('apc') ||
    combined.includes('pdp')
  ) {
    theme = 'nigeria_politics';
  } else if (
    combined.includes('rangers') ||
    combined.includes('caf') ||
    combined.includes('football') ||
    combined.includes('champions league') ||
    combined.includes('alger') ||
    combined.includes('sport') ||
    combined.includes('match') ||
    combined.includes('cup') ||
    combined.includes('super eagles') ||
    combined.includes('premier league') ||
    combined.includes('arsenal') ||
    combined.includes('chelsea')
  ) {
    theme = 'sports_football';
  } else if (
    combined.includes('ebola') ||
    combined.includes('health') ||
    combined.includes('virus') ||
    combined.includes('ncdc') ||
    combined.includes('strain') ||
    combined.includes('medical') ||
    combined.includes('hospital') ||
    combined.includes('disease') ||
    combined.includes('doctor')
  ) {
    theme = 'health_science';
  } else if (
    combined.includes('iphone') ||
    combined.includes('apple') ||
    combined.includes('tech') ||
    combined.includes('ai') ||
    combined.includes('software') ||
    combined.includes('platform') ||
    combined.includes('gadget') ||
    combined.includes('digital') ||
    combined.includes('cyber') ||
    combined.includes('app')
  ) {
    theme = 'technology_ai';
  } else if (
    combined.includes('polytechnic') ||
    combined.includes('nbte') ||
    combined.includes('university') ||
    combined.includes('campus') ||
    combined.includes('naus') ||
    combined.includes('education') ||
    combined.includes('youth') ||
    combined.includes('students') ||
    combined.includes('school') ||
    combined.includes('asuu')
  ) {
    theme = 'education_youth';
  } else if (
    combined.includes('fuel') ||
    combined.includes('nnpc') ||
    combined.includes('petrol') ||
    combined.includes('economy') ||
    combined.includes('subsidy') ||
    combined.includes('inflation') ||
    combined.includes('market') ||
    combined.includes('tax') ||
    combined.includes('naira') ||
    combined.includes('dangote') ||
    combined.includes('refinery') ||
    combined.includes('bank') ||
    combined.includes('cbn')
  ) {
    theme = 'economy_business';
  } else if (
    combined.includes('ndybest') ||
    combined.includes('entertainment') ||
    combined.includes('movie') ||
    combined.includes('music') ||
    combined.includes('spicy circle') ||
    combined.includes('culture') ||
    combined.includes('celebrity') ||
    combined.includes('nollywood')
  ) {
    theme = 'entertainment_culture';
  }

  const pool = CLIENT_THEME_IMAGES[theme] || CLIENT_THEME_IMAGES.broadcasting_media;
  const hash = hashString(title || category || 'news');
  return pool[hash % pool.length];
}
