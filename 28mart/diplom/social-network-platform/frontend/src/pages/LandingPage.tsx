import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeroGeometric } from '../components/ui/shape-landing-hero';
import { FiUsers, FiMessageCircle, FiCalendar, FiSave, FiHash } from 'react-icons/fi';
import { ShinyButton } from '../components/ui/ShinyButton';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaTiktok, FaYoutube, FaTelegram, FaDiscord, FaReddit, FaSnapchat, FaWhatsapp, FaPinterest, FaSpotify, FaTwitch, FaMedium } from 'react-icons/fa';
import ConfettiExplosion from '../components/animations/ConfettiExplosion';

// Flying Social Media Icons Component
const FlyingEmojis: React.FC = () => {
  // Social media icons with corresponding colors
  const socialIcons = [
    { icon: <FaFacebook />, color: '#1877F2' },  // Facebook blue
    { icon: <FaTwitter />, color: '#1DA1F2' },   // Twitter blue
    { icon: <FaInstagram />, color: '#E4405F' }, // Instagram pink
    { icon: <FaLinkedin />, color: '#0A66C2' },  // LinkedIn blue
    { icon: <FaTiktok />, color: '#000000' },    // TikTok black
    { icon: <FaYoutube />, color: '#FF0000' },   // YouTube red
    { icon: <FaTelegram />, color: '#0088cc' },  // Telegram blue
    { icon: <FaDiscord />, color: '#5865F2' },   // Discord purple
    { icon: <FaReddit />, color: '#FF4500' },    // Reddit orange
    { icon: <FaSnapchat />, color: '#FFFC00' },  // Snapchat yellow
    { icon: <FaWhatsapp />, color: '#25D366' },  // WhatsApp green
    { icon: <FaPinterest />, color: '#E60023' }, // Pinterest red
    { icon: <FaSpotify />, color: '#1DB954' },   // Spotify green
    { icon: <FaTwitch />, color: '#9146FF' },    // Twitch purple
    { icon: <FaMedium />, color: '#000000' },    // Medium black
  ];

  const [iconElements, setIconElements] = useState<React.ReactElement[]>([]);

  useEffect(() => {
    // Create new icons every 1.5 seconds (faster than before)
    const interval = setInterval(() => {
      const randomIcon = socialIcons[Math.floor(Math.random() * socialIcons.length)];
      const size = 24 + Math.floor(Math.random() * 24); // Random size between 24px and 48px
      
      const newIcon = (
        <div
          key={Date.now()}
          className="absolute animate-float-emoji"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDuration: `${6 + Math.random() * 7}s`, // Slightly faster animation
            opacity: 0.8,
            transform: `rotate(${Math.random() * 30 - 15}deg)`,
            fontSize: `${size}px`,
            color: randomIcon.color,
          }}
        >
          {randomIcon.icon}
        </div>
      );

      setIconElements(prev => [...prev, newIcon]);

      // Remove old icons if count exceeds 25 (increased limit)
      if (iconElements.length > 25) { 
        setIconElements(prev => prev.slice(prev.length - 25)); // Keep only the last 25
      }
    }, 1500); // Add new icon every 1.5 seconds instead of 2

    return () => clearInterval(interval);
  }, [iconElements.length]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {iconElements}
    </div>
  );
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Clean up any auth-related flags when landing page loads
  useEffect(() => {
    // Don't manipulate auth tokens directly, as it can cause issues
    console.log('Landing page: Loaded');
    
    return () => {
      // Cleanup on unmount
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#030303] text-white">
      {/* Add Confetti Explosion that triggers on load */}
      <ConfettiExplosion autoExplode={true} delay={800} />
      
      {/* Navigation */}
      <nav className="relative z-20 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
           
            <span className="ml-3 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300">ConnectMe</span>
          </div>
          <div className="flex space-x-4">
            <ShinyButton 
              onClick={() => navigate('/login')} 
              className="px-5 py-2 text-sm"
            >
              Sign In
            </ShinyButton>
            <Link to="/register">
              <ShinyButton className="px-5 py-2 text-sm">Join Now</ShinyButton>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section with flying emojis */}
      <div className="relative">
        <FlyingEmojis />
        <HeroGeometric 
          badge="Social Network Platform"
          title1="Connect, Share"
          title2="Discover Together"
        />
      </div>

      {/* Features Section */}
      <div className="relative z-10 py-24 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Everything You Need to Connect
            </h2>
            <p className="text-xl text-white/40 max-w-2xl mx-auto">
              A modern platform designed to bring people together through shared interests and experiences.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<FiUsers className="h-6 w-6" />}
              title="Dynamic Communities"
              description="Join interest-based groups that connect you with like-minded people who share your passions."
            />
            <FeatureCard 
              icon={<FiMessageCircle className="h-6 w-6" />}
              title="Real-time Conversations"
              description="Stay connected with instant messaging in groups, events, and one-on-one chats."
            />
            <FeatureCard 
              icon={<FiCalendar className="h-6 w-6" />}
              title="Engaging Events"
              description="Discover and participate in online and in-person events with people who share your interests."
            />
            <FeatureCard 
              icon={<FiSave className="h-6 w-6" />}
              title="Content Sharing"
              description="Share posts, images, and videos with your network or within specific communities."
            />
            <FeatureCard 
              icon={<FiHash className="h-6 w-6" />}
              title="Smart Discovery"
              description="Find relevant content and connections through our intelligent recommendation system."
            />
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/10 to-rose-500/10 border border-white/10 p-8 h-full flex flex-col justify-center">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-500/20 to-rose-500/20 blur-2xl" />
              <div className="relative z-10">
                <h3 className="text-xl font-semibold text-white mb-4">
                  Ready to Join?
                </h3>
                <p className="text-white/60 mb-6">
                  Create your account today and start connecting with a growing community.
                </p>
                <Link to="/register">
                  <ShinyButton className="bg-white text-indigo-900 hover:bg-white/90">
                    Get Started
                  </ShinyButton>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-24 bg-[#030303]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              What Our Users Say
            </h2>
            <p className="text-xl text-white/40 max-w-2xl mx-auto">
              Join thousands of satisfied users already connecting on our platform.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "ConnectMe has transformed how I connect with people who share my interests. The groups and events feature is incredible!",
                author: "Sophia L.",
                role: "Photography Enthusiast"
              },
              {
                quote: "I've made meaningful connections and discovered new opportunities through this platform. The user experience is smooth and intuitive.",
                author: "Marcus T.",
                role: "Tech Community Leader"
              },
              {
                quote: "The real-time chat and content sharing capabilities make this the perfect platform for our book club to stay connected between meetings.",
                author: "Elena R.",
                role: "Book Club Organizer"
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                <p className="text-white/70 mb-6">"{testimonial.quote}"</p>
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-rose-500 flex items-center justify-center text-white font-bold">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div className="ml-3">
                    <h4 className="text-white font-medium">{testimonial.author}</h4>
                    <p className="text-white/50 text-sm">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="py-24 bg-gradient-to-br from-indigo-900/20 via-[#040404] to-rose-900/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Join Our Community Today
          </h2>
          <p className="text-xl text-white/50 mb-10 max-w-3xl mx-auto">
            Connect with friends, discover new interests, and build meaningful relationships in a space designed for genuine connections.
          </p>
          <Link to="/register">
            <ShinyButton className="px-8 py-4 text-lg">
              Create Your Account
            </ShinyButton>
          </Link>
          <p className="mt-4 text-white/30">
            No commitment. Create your account in minutes.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 bg-[#020202] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">
                Company
              </h3>
              <ul className="space-y-3">
                <FooterLink text="About Us" />
                <FooterLink text="Careers" />
                <FooterLink text="Blog" />
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">
                Resources
              </h3>
              <ul className="space-y-3">
                <FooterLink text="Help Center" />
                <FooterLink text="Tutorials" />
                <FooterLink text="Developers" />
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">
                Legal
              </h3>
              <ul className="space-y-3">
                <FooterLink text="Privacy Policy" />
                <FooterLink text="Terms of Service" />
                <FooterLink text="Cookies Policy" />
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">
                Connect
              </h3>
              <ul className="space-y-3">
                <FooterLink text="Twitter" />
                <FooterLink text="Instagram" />
                <FooterLink text="Facebook" />
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <img 
                src="/logo.svg" 
                alt="ConnectMe"
                className="h-8 w-auto"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://via.placeholder.com/32x32?text=CM';
                }}
              />
              <span className="ml-2 text-xl font-bold text-white/80">ConnectMe</span>
            </div>
            <p className="text-white/30 text-sm">
              &copy; {new Date().getFullYear()} ConnectMe. All rights reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Helper components
const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur p-8 border border-white/10 h-full">
    <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-500/10 to-rose-500/10 blur-2xl" />
    <div className="relative z-10">
      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-rose-500/20 flex items-center justify-center text-indigo-300 mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
      <p className="text-white/60">{description}</p>
    </div>
  </div>
);

const FooterLink = ({ text }: { text: string }) => (
  <li>
    <a href="#" className="text-white/60 hover:text-white transition-colors">
      {text}
    </a>
  </li>
);

export default LandingPage;
