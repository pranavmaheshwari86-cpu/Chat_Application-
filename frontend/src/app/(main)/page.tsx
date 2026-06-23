/* eslint-disable */
"use client";

import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function HomePage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const navigateToChat = () => {
    router.push('/direct/inbox');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 flex gap-6 md:gap-10 relative h-full">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-surface-variant/10 via-background to-background pointer-events-none -z-10"></div>
      
      <div className="flex-1 flex flex-col gap-6 md:gap-10 min-w-0 max-w-5xl mx-auto w-full">
        {/* Daily Context Section */}
        <section className="glass-panel rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-secondary to-surface-variant"></div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="font-headline-md text-[20px] sm:text-[24px] text-on-surface flex items-center gap-2 sm:gap-3 m-0">
                <span className="material-symbols-outlined text-secondary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                Daily Context
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-2xl">
                AI-generated summary of your ecosystem since last login.
              </p>
            </div>
            <span className="font-label-caps text-label-caps text-on-surface-variant bg-surface-container-high px-3 py-1.5 rounded border border-white/5 shadow-sm">
              UPDATED 2M AGO
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div role="button" tabIndex={0} onClick={navigateToChat} onKeyDown={(e) => e.key === 'Enter' && navigateToChat()} className="bg-surface-container-low/50 border border-white/5 rounded-xl p-4 sm:p-6 hover:bg-white/5 transition-colors group/card hover:border-secondary/20 cursor-pointer">
              <h3 className="font-label-caps text-[12px] text-secondary mb-3 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                Urgent Action
              </h3>
              <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                Sarah's team approved the Q3 roadmap. They are awaiting your final sign-off on the resource allocation thread before EOD.
              </p>
            </div>
            
            <div role="button" tabIndex={0} onClick={navigateToChat} onKeyDown={(e) => e.key === 'Enter' && navigateToChat()} className="bg-surface-container-low/50 border border-white/5 rounded-xl p-4 sm:p-6 hover:bg-white/5 transition-colors group/card cursor-pointer">
              <h3 className="font-label-caps text-[12px] text-outline mb-3 uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">insights</span>
                Intelligence Brief
              </h3>
              <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                Discussion volume in <span className="text-secondary hover:underline">#engineering-sync</span> spiked by 40% regarding the new API rate limits. 3 unresolved questions remain.
              </p>
            </div>
          </div>
        </section>

        {/* Priority Contacts Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-headline-md text-[24px] text-on-surface m-0">Priority Contacts</h2>
            <button onClick={navigateToChat} className="font-label-caps text-[12px] text-secondary hover:text-secondary-fixed transition-colors uppercase tracking-widest flex items-center gap-1">
              View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Contact Card 1 */}
            <div role="button" tabIndex={0} onClick={navigateToChat} onKeyDown={(e) => e.key === 'Enter' && navigateToChat()} className="glass-panel rounded-2xl p-6 flex flex-col gap-4 hover:-translate-y-1 transition-all cursor-pointer group border-white/5 hover:border-secondary/20">
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14">
                  <Image 
                    alt="Marcus Chen" 
                    fill
                    className="rounded-full object-cover border border-white/10" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuByaQa-q2O8NVvlMvP3SH_Om6f4igqwL6Kaop2whjIgrTJcb5bZbObeOWnrxrOXiJTt0EaZbeRM-ViJYnUd82Gjqo7ofp_FMsvhvt1JXELh88bh2OwYO0vCJf5dVNrL39qhQkqlep8sE9_eP56XvkpSI9ZXQnjjkH5k-g_a2GWbngniG8f3luNn5NkYKrpTVJMi_i4CL71CPOIvMbIbRJ50XWzGn2El_7UWKQBCC8Q1EDaZoqVAN66Nw9zWfd6ySpBHlwWyOZr7nBE"
                  />
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-secondary rounded-full border-2 border-surface-container"></span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-headline-md text-[18px] text-on-surface truncate m-0">Marcus Chen</h3>
                  <p className="font-body-md text-[13px] text-on-surface-variant truncate mt-0.5">VP Engineering, Nexus</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                <span className="font-body-md text-[13px] text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">schedule</span> 10m ago
                </span>
                <div className="flex items-center gap-3">
                  <div className="px-2 py-0.5 rounded bg-secondary/10 text-secondary font-label-caps text-[10px] border border-secondary/20">92/100</div>
                  <button onClick={(e) => { e.stopPropagation(); navigateToChat(); }} className="text-outline hover:text-secondary transition-colors">
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Contact Card 2 */}
            <div role="button" tabIndex={0} onClick={navigateToChat} onKeyDown={(e) => e.key === 'Enter' && navigateToChat()} className="glass-panel rounded-2xl p-6 flex flex-col gap-4 hover:-translate-y-1 transition-all cursor-pointer group border-white/5 hover:border-secondary/20">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center font-headline-md text-[18px] text-on-surface border border-white/10 shadow-inner">
                    EJ
                  </div>
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-surface-variant rounded-full border-2 border-surface-container"></span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-headline-md text-[18px] text-on-surface truncate m-0">Elena Jones</h3>
                  <p className="font-body-md text-[13px] text-on-surface-variant truncate mt-0.5">Lead Designer</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                <span className="font-body-md text-[13px] text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">schedule</span> 2h ago
                </span>
                <div className="flex items-center gap-3">
                  <div className="px-2 py-0.5 rounded bg-surface-variant text-on-surface-variant font-label-caps text-[10px] border border-white/5">88/100</div>
                  <button onClick={(e) => { e.stopPropagation(); navigateToChat(); }} className="text-outline hover:text-secondary transition-colors">
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Contact Card 3 */}
            <div role="button" tabIndex={0} onClick={navigateToChat} onKeyDown={(e) => e.key === 'Enter' && navigateToChat()} className="glass-panel rounded-2xl p-6 flex flex-col gap-4 hover:-translate-y-1 transition-all cursor-pointer group border-white/5 hover:border-secondary/20">
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14">
                  <Image 
                    alt="Chloe Vance" 
                    fill
                    className="rounded-full object-cover border border-white/10" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDMjt9Qv37frA8sx-qMU_Y7SKQlZuGWxJ9FSw3LFHt0Bd9JnCYkIsji6I0uqNOA7jxORYxLDyLZv05xPIguSuKOeoLpfpxOmKWVwFseEX4LuRKrWC_wSCFzCwG5o1D7EsNuOrHmqPCQRpAHYwo-DzfRGZTQOjMspshE3Y8JEBFGX6VbXddMZ7JUenegvUxsnjFqxzXwfxu2xLFmoZJOgGEaEsRcOJFg24vt6g5GI0TzWol0eNBOlgqLrME2snX-kiFgBQ4kykiNRAQ"
                  />
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-secondary rounded-full border-2 border-surface-container"></span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-headline-md text-[18px] text-on-surface truncate m-0">Chloe Vance</h3>
                  <p className="font-body-md text-[13px] text-on-surface-variant truncate mt-0.5">Product Manager</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                <span className="font-body-md text-[13px] text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">schedule</span> 1d ago
                </span>
                <div className="flex items-center gap-3">
                  <div className="px-2 py-0.5 rounded bg-surface-variant text-on-surface-variant font-label-caps text-[10px] border border-white/5">95/100</div>
                  <button onClick={(e) => { e.stopPropagation(); navigateToChat(); }} className="text-outline hover:text-secondary transition-colors">
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Search Bar */}
        <div className="mt-auto pt-8 pb-2">
          <div className="relative max-w-3xl mx-auto w-full">
            <div className="relative flex items-center bg-[#151718] border border-[#f2ca50]/40 rounded-xl overflow-hidden focus-within:border-[#f2ca50] transition-colors shadow-lg">
              <input 
                type="text" 
                placeholder="Ask AI or search anything..." 
                className="w-full bg-transparent text-on-surface placeholder:text-on-surface-variant/50 px-5 py-3.5 focus:outline-none font-body-md"
              />
              <button className="absolute right-2.5 p-1.5 bg-[#f2ca50] text-black rounded-lg hover:bg-[#f2ca50]/90 transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
              </button>
            </div>
            <p className="text-center text-[10px] text-on-surface-variant/50 mt-3 font-body-sm">
              AI can make mistakes. Consider verifying important information.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
