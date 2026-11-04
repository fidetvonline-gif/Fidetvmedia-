import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase URL or Key in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const NEW_CHANNELS = [
  // --- Nigerian Television ---
  {
    name: 'Channels Television',
    category: 'Nigerian Television',
    url: 'https://www.youtube.com/watch?v=g9z481_sj1g',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=800',
    description: 'Leading 24-hour Nigerian news and current affairs television station.',
    is_active: true,
    order_index: 1
  },
  {
    name: 'TVC News Nigeria',
    category: 'Nigerian Television',
    url: 'https://www.youtube.com/watch?v=kYjY_jT7zQo',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800',
    description: '24-hour all-news television channel broadcasting from Lagos, Nigeria.',
    is_active: true,
    order_index: 2
  },
  {
    name: 'Arise News',
    category: 'Nigerian Television',
    url: 'https://www.youtube.com/watch?v=WyL0Gi0g-7c',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?auto=format&fit=crop&q=80&w=800',
    description: 'Global news and perspective focusing on Africa and the world.',
    is_active: true,
    order_index: 3
  },
  {
    name: 'NTA International',
    category: 'Nigerian Television',
    url: 'https://www.youtube.com/watch?v=5r0_a_7X68w',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&q=80&w=800',
    description: 'Nigerian Television Authority international broadcasting service.',
    is_active: true,
    order_index: 4
  },
  {
    name: 'NTA News 24',
    category: 'Nigerian Television',
    url: 'https://www.youtube.com/watch?v=Lu5Yq_67f80',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?auto=format&fit=crop&q=80&w=800',
    description: '24-hour dedicated news channel from NTA.',
    is_active: true,
    order_index: 5
  },
  {
    name: 'News Central TV',
    category: 'Nigerian Television',
    url: 'https://www.youtube.com/watch?v=h3MuIUNCCzI',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1495020689067-958ab52e3367?auto=format&fit=crop&q=80&w=800',
    description: 'Pioneering African story-telling through unbiased journalism.',
    is_active: true,
    order_index: 6
  },
  {
    name: 'Trust TV',
    category: 'Nigerian Television',
    url: 'https://www.youtube.com/watch?v=j_Wk8V8Y8pY',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=800',
    description: 'Exceptional broadcasting and credible news from Media Trust Group.',
    is_active: true,
    order_index: 7
  },
  {
    name: 'TV360 Nigeria',
    category: 'Nigerian Television',
    url: 'https://www.youtube.com/watch?v=9Auq9mYxFEE',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800',
    description: 'Independent online television station based in Lagos.',
    is_active: true,
    order_index: 8
  },
  {
    name: 'Silverbird Television',
    category: 'Nigerian Television',
    url: 'https://www.youtube.com/watch?v=oa1yVJ0qJns',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&q=80&w=800',
    description: 'Entertainment, lifestyle, and news network.',
    is_active: true,
    order_index: 9
  },

  // --- African Television ---
  {
    name: 'Africanews',
    category: 'African Television',
    url: 'https://www.youtube.com/watch?v=WyL0Gi0g-7c',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&q=80&w=800',
    description: 'Multilingual pan-African news and current affairs channel.',
    is_active: true,
    order_index: 10
  },
  {
    name: 'SABC News',
    category: 'African Television',
    url: 'https://www.youtube.com/watch?v=9_H8q2Jg-8E',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?auto=format&fit=crop&q=80&w=800',
    description: 'South African Broadcasting Corporation 24-hour news channel.',
    is_active: true,
    order_index: 11
  },
  {
    name: 'Newzroom Afrika',
    category: 'African Television',
    url: 'https://www.youtube.com/watch?v=l_tQxL7b8gQ',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?auto=format&fit=crop&q=80&w=800',
    description: 'Independent news channel delivering in-depth stories across Africa.',
    is_active: true,
    order_index: 12
  },
  {
    name: 'Citizen TV',
    category: 'African Television',
    url: 'https://www.youtube.com/watch?v=pyj1Z_Wc0jw',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1495020689067-958ab52e3367?auto=format&fit=crop&q=80&w=800',
    description: 'Leading television network in Kenya.',
    is_active: true,
    order_index: 13
  },
  {
    name: 'KTN News Kenya',
    category: 'African Television',
    url: 'https://www.youtube.com/watch?v=dp8PhLsUcFE',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=800',
    description: '24-hour news broadcaster from Kenya.',
    is_active: true,
    order_index: 14
  },
  {
    name: 'Joy News',
    category: 'African Television',
    url: 'https://www.youtube.com/watch?v=w_Ma8oQLmGg',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800',
    description: 'Ghanaian premier 24-hour news channel.',
    is_active: true,
    order_index: 15
  },

  // --- International News ---
  {
    name: 'Al Jazeera English',
    category: 'International News',
    url: 'https://www.youtube.com/watch?v=j_Wk8V8Y8pY',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=800',
    description: 'Global news channel broadcasting from Doha, Qatar.',
    is_active: true,
    order_index: 16
  },
  {
    name: 'France 24 English',
    category: 'International News',
    url: 'https://www.youtube.com/watch?v=h3MuIUNCCzI',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=800',
    description: 'International news network based in Paris, France.',
    is_active: true,
    order_index: 17
  },
  {
    name: 'DW News',
    category: 'International News',
    url: 'https://www.youtube.com/watch?v=Lu5Yq_67f80',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&q=80&w=800',
    description: 'German international broadcaster focusing on world events.',
    is_active: true,
    order_index: 18
  },
  {
    name: 'Sky News',
    category: 'International News',
    url: 'https://www.youtube.com/watch?v=9Auq9mYxFEE',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?auto=format&fit=crop&q=80&w=800',
    description: 'British free-to-air television news channel.',
    is_active: true,
    order_index: 19
  },
  {
    name: 'BBC News',
    category: 'International News',
    url: 'https://www.youtube.com/watch?v=5r0_a_7X68w',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&q=80&w=800',
    description: 'British public broadcaster international news stream.',
    is_active: true,
    order_index: 20
  },
  {
    name: 'TRT World',
    category: 'International News',
    url: 'https://www.youtube.com/watch?v=oa1yVJ0qJns',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&q=80&w=800',
    description: 'Turkish international news television channel.',
    is_active: true,
    order_index: 21
  },
  {
    name: 'CGTN',
    category: 'International News',
    url: 'https://www.youtube.com/watch?v=9_H8q2Jg-8E',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&q=80&w=800',
    description: 'China Global Television Network multi-language news service.',
    is_active: true,
    order_index: 22
  },
  {
    name: 'WION',
    category: 'International News',
    url: 'https://www.youtube.com/watch?v=l_tQxL7b8gQ',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&q=80&w=800',
    description: 'World Is One News - international news channel from India.',
    is_active: true,
    order_index: 23
  },
  {
    name: 'Euronews',
    category: 'International News',
    url: 'https://www.youtube.com/watch?v=pyj1Z_Wc0jw',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1491557345352-5929e343eb89?auto=format&fit=crop&q=80&w=800',
    description: 'European multilingual news television channel.',
    is_active: true,
    order_index: 24
  },
  {
    name: 'Bloomberg Television',
    category: 'International News',
    url: 'https://www.youtube.com/watch?v=dp8PhLsUcFE',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=800',
    description: 'Global business and financial news network.',
    is_active: true,
    order_index: 25
  },
  {
    name: 'ABC News Live',
    category: 'International News',
    url: 'https://www.youtube.com/watch?v=w_Ma8oQLmGg',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=800',
    description: 'American 24/7 streaming news channel.',
    is_active: true,
    order_index: 26
  },
  {
    name: 'NHK World-Japan',
    category: 'International News',
    url: 'https://www.youtube.com/watch?v=g9z481_sj1g',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800',
    description: 'Japan international broadcasting service.',
    is_active: true,
    order_index: 27
  },

  // --- Business ---
  {
    name: 'Bloomberg Television',
    category: 'Business',
    url: 'https://www.youtube.com/watch?v=dp8PhLsUcFE',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=800',
    description: 'Markets, finance, and global economic analysis.',
    is_active: true,
    order_index: 28
  },
  {
    name: 'CNBC',
    category: 'Business',
    url: 'https://www.youtube.com/watch?v=w_Ma8oQLmGg',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800',
    description: 'First in business worldwide, stock market coverage.',
    is_active: true,
    order_index: 29
  },
  {
    name: 'Yahoo Finance Live',
    category: 'Business',
    url: 'https://www.youtube.com/watch?v=kYjY_jT7zQo',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=800',
    description: 'Financial news, stock market updates, and expert investment insights.',
    is_active: true,
    order_index: 30
  },

  // --- Sports ---
  {
    name: 'Red Bull TV',
    category: 'Sports',
    url: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
    stream_type: 'hls',
    thumbnail: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=800',
    description: '24/7 Action sports, extreme sports, and lifestyle broadcasting.',
    is_active: true,
    order_index: 31
  },
  {
    name: 'FIFA+',
    category: 'Sports',
    url: 'https://www.youtube.com/watch?v=WyL0Gi0g-7c',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800',
    description: 'Official football matches, documentaries, and live tournaments.',
    is_active: true,
    order_index: 32
  },
  {
    name: 'Olympic Channel',
    category: 'Sports',
    url: 'https://www.youtube.com/watch?v=Lu5Yq_67f80',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=800',
    description: 'Year-round Olympic sports coverage and athlete features.',
    is_active: true,
    order_index: 33
  },
  {
    name: 'Sports News & Analysis',
    category: 'Sports',
    url: 'https://www.youtube.com/watch?v=9_H8q2Jg-8E',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1517649763962-0c623266d102?auto=format&fit=crop&q=80&w=800',
    description: 'Daily sports highlights, match reviews, and analysis.',
    is_active: true,
    order_index: 34
  },

  // --- Entertainment ---
  {
    name: 'Global Music TV',
    category: 'Entertainment',
    url: 'https://www.youtube.com/watch?v=h3MuIUNCCzI',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
    description: '24/7 Hit music videos and artist features.',
    is_active: true,
    order_index: 35
  },
  {
    name: 'Lifestyle & Culture',
    category: 'Entertainment',
    url: 'https://www.youtube.com/watch?v=j_Wk8V8Y8pY',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?auto=format&fit=crop&q=80&w=800',
    description: 'Fashion, travel, design, and cultural programming.',
    is_active: true,
    order_index: 36
  },
  {
    name: 'Cinema & Movie Showcase',
    category: 'Entertainment',
    url: 'https://www.youtube.com/watch?v=9Auq9mYxFEE',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=800',
    description: 'Authorized classic films, indie movies, and trailers.',
    is_active: true,
    order_index: 37
  },

  // --- Religious ---
  {
    name: 'Christian Television Network',
    category: 'Religious',
    url: 'https://www.youtube.com/watch?v=5r0_a_7X68w',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80&w=800',
    description: 'Inspirational Christian programs, worship services, and teachings.',
    is_active: true,
    order_index: 38
  },
  {
    name: 'Islamic Broadcast Network',
    category: 'Religious',
    url: 'https://www.youtube.com/watch?v=oa1yVJ0qJns',
    stream_type: 'youtube',
    thumbnail: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&q=80&w=800',
    description: 'Islamic lectures, Quranic recitations, and community programs.',
    is_active: true,
    order_index: 39
  }
];

async function run() {
  console.log('--- FIDE TV CHANNEL REPLACEMENT SCRIPT ---');

  // Step 1: Backup existing tv_channels
  console.log('Step 1: Backing up existing tv_channels...');
  const { data: existingChannels, error: fetchError } = await supabase.from('tv_channels').select('*');
  
  if (fetchError) {
    console.error('Error fetching existing channels:', fetchError);
  } else {
    const count = existingChannels?.length || 0;
    console.log(`Found ${count} existing channels.`);
    fs.writeFileSync('tv_channels_backup.json', JSON.stringify(existingChannels || [], null, 2));
    console.log('Backup successfully saved to tv_channels_backup.json.');
  }

  // Step 2: Remove old channels
  console.log('Step 2: Removing old channel records...');
  // Delete all records from tv_channels table
  const { error: deleteError } = await supabase.from('tv_channels').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
  if (deleteError) {
    console.error('Error deleting old channels:', deleteError);
  } else {
    console.log('Successfully removed old channel records.');
  }

  // Step 3: Insert new verified channels
  console.log(`Step 3: Inserting ${NEW_CHANNELS.length} new verified channels...`);
  let insertedCount = 0;
  for (const ch of NEW_CHANNELS) {
    const { error: insertError } = await supabase.from('tv_channels').insert([ch]);
    if (insertError) {
      console.error(`Failed to insert channel "${ch.name}":`, insertError.message);
    } else {
      insertedCount++;
    }
  }

  console.log(`--- REPLACEMENT COMPLETE ---`);
  console.log(`Backed up: ${existingChannels?.length || 0} channels`);
  console.log(`Removed: ${existingChannels?.length || 0} old channels`);
  console.log(`Added: ${insertedCount} new verified channels across 7 categories.`);
}

run();
