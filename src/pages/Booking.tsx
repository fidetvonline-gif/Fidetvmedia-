import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock, Banknote, MessageSquare, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const bookingSchema = z.object({
  client_name: z.string().min(2, 'Name is required'),
  client_email: z.string().email('Invalid email address'),
  event_type: z.string().min(1, 'Please select an event type'),
  date: z.string().min(1, 'Please select a date'),
  budget: z.string().optional(),
  message: z.string().min(10, 'Please tell us more about your event'),
});

type BookingFormData = z.infer<typeof bookingSchema>;

export default function Booking() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
  });

  const onSubmit = async (data: BookingFormData) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.from('bookings').insert({
        ...data,
        user_id: session?.user?.id || null,
        status: 'pending',
      });
      if (error) throw error;
      setSuccess(true);
      reset();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const eventTypes = [
    'Wedding / Private Event',
    'Corporate Conference',
    'Live Concert / Music',
    'Commercial / Brand Shoot',
    'Interview / Media Content',
    'Other'
  ];

  return (
    <div className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row gap-20">
        
        {/* Info Column */}
        <div className="lg:w-1/3 space-y-12">
          <div className="space-y-6">
            <h4 className="text-primary font-display font-bold uppercase tracking-[0.5em] text-xs">Request a Session</h4>
            <h1 className="text-5xl sm:text-6xl font-display font-bold text-white tracking-tighter leading-tight italic">
              Book Your<br /><span className="text-primary">Vision</span>.
            </h1>
            <p className="text-gray-400 font-light leading-relaxed">
              Tell us about your upcoming project or event. Our team will review your requirements and get back to you within 24 hours with a custom proposal.
            </p>
          </div>

          <div className="space-y-8">
            <div className="flex space-x-6">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/10">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-1">Flexibility</h4>
                <p className="text-xs text-gray-500 leading-relaxed">Available for local and international travel assignments.</p>
              </div>
            </div>
            <div className="flex space-x-6">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/10">
                <Banknote className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-1">Transparent Pricing</h4>
                <p className="text-xs text-gray-500 leading-relaxed">Packages tailored to your specific budget and production needs.</p>
              </div>
            </div>
            <div className="flex space-x-6">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/10">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-1">Pro Standards</h4>
                <p className="text-xs text-gray-500 leading-relaxed">Broadcasting-grade equipment and cinematic quality as standard.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Column */}
        <div className="flex-grow">
          <div className="glass rounded-[3rem] p-8 sm:p-16 border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32" />

            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-8 py-12"
              >
                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-500/30">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
                <h2 className="text-3xl font-display font-bold text-white">Booking Received!</h2>
                <p className="text-gray-400 max-w-sm mx-auto leading-relaxed">
                  Thank you for reaching out to FideTV. We've received your request and will contact you shortly to discuss the next steps. Please check your email for a confirmation and further instructions.
                </p>
                <button
                  onClick={() => setSuccess(false)}
                  className="px-10 py-4 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-full hover:scale-105 transition-transform"
                >
                  Send Another Request
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 relative z-10">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center space-x-3 text-red-500 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-4">Full Name</label>
                    <input
                      {...register('client_name')}
                      placeholder="John Doe"
                      className="w-full bg-surface border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:border-primary/50 transition-all"
                    />
                    {errors.client_name && <p className="text-red-500 text-xs ml-4">{errors.client_name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-4">Email Address</label>
                    <input
                      {...register('client_email')}
                      placeholder="john@example.com"
                      className="w-full bg-surface border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:border-primary/50 transition-all"
                    />
                    {errors.client_email && <p className="text-red-500 text-xs ml-4">{errors.client_email.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-4">Event Type</label>
                    <select
                      {...register('event_type')}
                      className="w-full bg-surface border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:border-primary/50 transition-all appearance-none"
                    >
                      <option value="">Select an option</option>
                      {eventTypes.map(t => <option key={t} value={t} className="bg-surface">{t}</option>)}
                    </select>
                    {errors.event_type && <p className="text-red-500 text-xs ml-4">{errors.event_type.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-4">Event Date</label>
                    <input
                      type="date"
                      {...register('date')}
                      className="w-full bg-surface border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:border-primary/50 transition-all"
                    />
                    {errors.date && <p className="text-red-500 text-xs ml-4">{errors.date.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-4">Estimated Budget (Optional)</label>
                  <input
                    {...register('budget')}
                    placeholder="e.g. ₦2,000,000 - ₦5,000,000"
                    className="w-full bg-surface border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-4">Project Details</label>
                  <textarea
                    {...register('message')}
                    placeholder="Describe your event, location, and specific media needs..."
                    className="w-full bg-surface border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:border-primary/50 transition-all min-h-[150px] resize-none"
                  />
                  {errors.message && <p className="text-red-500 text-xs ml-4">{errors.message.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-white font-black uppercase tracking-[0.2em] py-6 rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center space-x-4 shadow-2xl shadow-primary/20 group"
                >
                  <span>{loading ? 'Submitting...' : 'Confirm Request'}</span>
                  {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
