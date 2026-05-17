import os

current_dir = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(current_dir, 'chart_paradox.html'), 'r', encoding='utf-8') as f:
    paradox = f.read()

with open(os.path.join(current_dir, 'chart_convergence.html'), 'r', encoding='utf-8') as f:
    convergence = f.read()

with open(os.path.join(current_dir, 'chart_audit.html'), 'r', encoding='utf-8') as f:
    audit = f.read()

html_block = f"""
        <!-- Section: Data Analytics & Visualizations -->
        <section class="py-32 px-6 max-w-7xl mx-auto" id="analytics">
            <div class="space-y-12">
                <h2 class="gsap-reveal font-sans font-bold uppercase tracking-tighter text-4xl md:text-6xl text-charcoal leading-none text-center">
                    ANALYTICS & <span class="text-neutral-400">CONVERGENCE</span>
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <!-- THE PREDICTION PARADOX PANEL -->
                    <div class="showcase-glass-panel p-6 flex flex-col h-[480px] gsap-reveal">
                        <div class="w-full h-full flex-grow relative" style="min-height: 350px;">
                            {paradox}
                        </div>
                    </div>
                    <!-- PHYSICAL CAGE CONVERGENCE PANEL -->
                    <div class="showcase-glass-panel p-6 flex flex-col h-[480px] gsap-reveal">
                        <div class="w-full h-full flex-grow relative" style="min-height: 350px;">
                            {convergence}
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-1 mt-8 gap-8 max-w-4xl mx-auto">
                    <!-- ARCHITECTURE AUDIT PANEL -->
                    <div class="showcase-glass-panel p-6 flex flex-col h-[520px] gsap-reveal">
                        <div class="w-full h-full flex-grow relative" style="min-height: 380px;">
                            {audit}
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- INTELLIGENCE VAULT SECTION -->
"""

index_path = os.path.join(current_dir, 'index.html')
with open(index_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "<!-- Section: Data Analytics & Visualizations -->"
end_marker = "<!-- INTELLIGENCE VAULT SECTION -->"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    # Replace the existing section
    content = content[:start_idx] + html_block.strip() + "\n\n" + content[end_idx:]
    print("Replaced existing charts section using safe string slicing.")
else:
    # Fresh injection
    content = content.replace("<!-- INTELLIGENCE VAULT SECTION -->", html_block)
    print("Injected charts section fresh.")

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Injection complete.")
