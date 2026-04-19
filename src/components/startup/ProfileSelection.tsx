import React, { useState } from 'react';
import { PlusCircle, Pencil, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { Profile } from '../../types/chat';

function Tooltip({ children, text }: { children: React.ReactNode, text: string }) {
  return (
    <div className="relative group flex items-center justify-center">
      {children}
      <div className="absolute -bottom-12 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-card border border-border text-primary text-sm py-2 px-4 rounded-full shadow-xl pointer-events-none whitespace-nowrap z-50 translate-y-2 group-hover:translate-y-0">
        {text}
      </div>
    </div>
  );
}

function ProfileCard({ 
  profile, 
  isManaging, 
  onEditProfile,
  onSelectProfile
}: { 
  profile: Profile, 
  isManaging: boolean, 
  onEditProfile: (profile: Profile) => void,
  onSelectProfile: (profile: Profile, remember: boolean) => void
}) {
  const [remember, setRemember] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [unToggledWhileHovering, setUnToggledWhileHovering] = useState(false);

  const isFilled = remember || (hovered && !unToggledWhileHovering);

  return (
    <motion.div 
      whileHover={{ scale: 1.05 }}
      className="flex flex-col items-center group cursor-pointer relative"
      onClick={() => isManaging ? onEditProfile(profile) : onSelectProfile(profile, remember)}
      style={{
        willChange: 'transform',
        transformStyle: 'preserve-3d',
        backfaceVisibility: 'hidden'
      }}
    >
      <div className="relative w-24 h-24 md:w-36 md:h-36 rounded-full overflow-hidden border-2 border-transparent group-hover:border-border transition-all duration-300">
        <img 
          src={profile.avatarUrl} 
          alt={profile.name} 
          className={`w-full h-full object-cover ${isManaging ? 'opacity-50' : ''}`}
          referrerPolicy="no-referrer"
        />
        {isManaging && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Pencil className="w-8 h-8 text-primary" />
          </div>
        )}
      </div>
      <span className="mt-4 text-primary/60 group-hover:text-primary transition-colors duration-300 text-sm md:text-base truncate max-w-[100px] md:max-w-[144px]">
        {profile.name}
      </span>
      <div className={`mt-4 transition-opacity duration-300 ${isManaging ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}>
        <button 
          className={`animated-button ${isFilled ? 'filled' : ''}`}
            onMouseEnter={() => {
              setHovered(true);
              setUnToggledWhileHovering(false);
            }}
            onMouseLeave={() => {
              setHovered(false);
              setUnToggledWhileHovering(false);
            }}
            onClick={(e) => {
              e.stopPropagation();
              const newValue = !remember;
              setRemember(newValue);
              if (!newValue) {
                setUnToggledWhileHovering(true);
              } else {
                setUnToggledWhileHovering(false);
              }
            }}
          >
            <svg viewBox="0 0 24 24" className="arr-2" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"></path>
            </svg>
            <span className="text">Remember me</span>
            <span className="circle"></span>
            <svg viewBox="0 0 24 24" className="arr-1" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"></path>
            </svg>
          </button>
        </div>
    </motion.div>
  );
}

export default function ProfileSelection({ 
  profiles, 
  onAddProfile, 
  onEditProfile,
  onSelectProfile
}: { 
  profiles: Profile[], 
  onAddProfile: () => void,
  onEditProfile: (profile: Profile) => void,
  onSelectProfile: (profile: Profile, remember: boolean) => void
}) {
  const [isManaging, setIsManaging] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center w-full max-w-5xl px-4"
      style={{
        willChange: 'transform, opacity',
        transformStyle: 'preserve-3d',
        backfaceVisibility: 'hidden'
      }}
    >
      <div
        data-tauri-drag-region
        className="flex w-full items-center justify-center gap-4 mb-12 rounded-2xl py-3 px-2"
      >
        <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-center text-primary flex-1 min-w-0">
          {isManaging ? "Manage Profiles" : "Who's chatting?"}
        </h1>
        <div className="no-drag shrink-0">
          <Tooltip text={isManaging ? "Done" : "Manage Profiles"}>
            <button
              type="button"
              onClick={() => setIsManaging(!isManaging)}
              className="p-2 text-primary/60 hover:text-primary transition-colors"
            >
              {isManaging ? <Check className="w-8 h-8" /> : <Pencil className="w-8 h-8" />}
            </button>
          </Tooltip>
        </div>
      </div>
      
      <div className="flex flex-wrap justify-center items-start gap-4 md:gap-8">
        {profiles.map((profile) => (
          <ProfileCard 
            key={profile.id} 
            profile={profile} 
            isManaging={isManaging} 
            onEditProfile={onEditProfile}
            onSelectProfile={onSelectProfile}
          />
        ))}
        
        {profiles.length < 6 && (
          <div className="flex flex-col items-center group cursor-pointer" onClick={onAddProfile}>
            <div className="w-24 h-24 md:w-36 md:h-36 rounded-full flex items-center justify-center border-2 border-transparent border-dotted group-hover:border-primary/40 transition-colors duration-300 relative">
               <PlusCircle className="w-12 h-12 md:w-16 md:h-16 text-primary/60 group-hover:text-primary transition-colors duration-300" strokeWidth={1.5} />
            </div>
            <span className="mt-4 text-primary/60 group-hover:text-primary transition-colors duration-300 text-sm md:text-base">
              Add Profile
            </span>
            <div className={`h-6 mt-2 transition-opacity duration-300 ${isManaging ? 'opacity-0 pointer-events-none' : ''}`} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
