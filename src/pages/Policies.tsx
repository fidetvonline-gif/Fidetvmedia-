import React from 'react';

export default function Policies() {
  const sections = [
    {
      title: "Privacy Policy",
      content: "At FideTV, we take your privacy seriously. This policy describes how we collect, use, and protect your personal information when you use our platform. We collect data such as your username, email, and activity on the site to provide and improve our services. We do not sell your personal data to third parties."
    },
    {
      title: "Terms of Service",
      content: "By using FideTV, you agree to comply with our terms. You are responsible for any content you post in the community. We reserve the right to remove any content or ban users that violate our community guidelines or engage in illegal activities on the platform."
    },
    {
      title: "Community Guidelines",
      content: "FideTV is a creative hub for everyone. We expect our members to be respectful, professional, and supportive. Harassment, hate speech, and spam are strictly prohibited. Let's keep our platform a positive space for all creators."
    }
  ];

  return (
    <div className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 mb-32">
       <div className="text-center space-y-4">
          <h1 className="text-5xl font-display font-bold text-foreground tracking-tight">Legal & Policies</h1>
          <p className="text-text-muted">Last updated: May 2026</p>
       </div>

       <div className="space-y-12">
          {sections.map((section, i) => (
            <div key={i} className="glass rounded-[2rem] p-10 space-y-6">
               <h2 className="text-2xl font-display font-bold text-primary">{section.title}</h2>
               <p className="text-text-muted leading-relaxed font-light">
                 {section.content}
               </p>
            </div>
          ))}
       </div>
    </div>
  );
}
