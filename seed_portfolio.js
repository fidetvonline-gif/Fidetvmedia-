import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const videos = [
    { title: 'Emeritus director of information has a message for us all', category: 'Campus Matters', image_url: `https://img.youtube.com/vi/0D-zn6YAqCY/maxresdefault.jpg`, youtube_id: '0D-zn6YAqCY', description: 'Emeritus director of information has a message for us all - Campus matters', is_featured: true },
    { title: 'If Shallipopi & Davido Catch This Girl...', category: 'Interviews', image_url: `https://img.youtube.com/vi/VyxGvAzBQGY/maxresdefault.jpg`, youtube_id: 'VyxGvAzBQGY', description: 'If Shallipopi & Davido Catch This Girl, You Won\'t Believe What Happens..', is_featured: true },
    { title: 'How can a girl who says she loves me be opening her eyes...', category: 'Love Affairs', image_url: `https://img.youtube.com/vi/w24bsyvgMjs/maxresdefault.jpg`, youtube_id: 'w24bsyvgMjs', description: 'How can a girl who says she loves me be opening her eyes every time we are kissing? - Love affair', is_featured: true },
    { title: 'Love affair: Exploring Non-Penetrative Sex', category: 'Love Affairs', image_url: `https://img.youtube.com/vi/4xQY7dyg8Pg/maxresdefault.jpg`, youtube_id: '4xQY7dyg8Pg', description: 'Love affair: Exploring Non-Penetrative Sex', is_featured: true },
    { title: 'Love affair: hubby said we buy a land together...', category: 'Love Affairs', image_url: `https://img.youtube.com/vi/4m-9f9saFbA/maxresdefault.jpg`, youtube_id: '4m-9f9saFbA', description: 'Love affair: hubby said we buy a land together, he said it\'s going to be fifty fifty', is_featured: true },
    { title: 'This one Sabi book oh 😂😂', category: 'Campus Matters', image_url: `https://img.youtube.com/vi/jrjpYn_nX8Q/maxresdefault.jpg`, youtube_id: 'jrjpYn_nX8Q', description: 'This one Sabi book oh 😂😂 || FIDE TV', is_featured: true },
];

async function seed() {
  for (const video of videos) {
    const { error } = await supabase.from('portfolio_items').insert(video);
    if (error) {
      console.error('Error inserting', video.title, error);
    } else {
      console.log('Inserted', video.title);
    }
  }
}
seed();
