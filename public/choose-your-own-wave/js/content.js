/* =========================================================================
   CHOOSE YOUR OWN WAVE — physics content & forest graph
   Normalized parameters used for plots / animations:
     electron nodes:  ω_pe = 1, ω_ce = 0.8 ω_pe, c = 1
     ion nodes:       Ω_ci = 1 (or ω_pi = 1), lengths in λ_De or ρ_s
   ========================================================================= */
(function () {
  const WC = 0.8;                                  // ω_ce / ω_pe
  const WR = 0.5 * (WC + Math.sqrt(WC * WC + 4));  // R cutoff
  const WL = WR - WC;                              // L cutoff
  const WUH = Math.sqrt(1 + WC * WC);              // upper hybrid
  const VS_VA = 0.6;                               // v_s / v_A for magnetosonic

  const n2X = w => 1 - (1 / (w * w)) * (w * w - 1) / (w * w - WUH * WUH);
  const n2R = w => 1 - (1 / (w * w)) / (1 - WC / w);
  const n2L = w => 1 - (1 / (w * w)) / (1 + WC / w);

  const PHYS = { WC, WR, WL, WUH, VS_VA };

  /* dials = the assumption "state". Shown as a table; changes are highlighted. */
  const DIAL_LABELS = {
    Te: 'Temperature', ions: 'Ions', B0: 'B₀', Ek: 'E₁ vs k', EB: 'E₁ vs B₀', reg: 'Regime'
  };

  const NODES = {
    /* --------------------------------------------------------------- */
    START: {
      name: 'The Trailhead', short: 'TRAILHEAD', kind: 'start', pos: [5, 0.45],
      dials: { Te: 'cold (T = 0)', ions: 'fixed', B0: 'none', Ek: '—', EB: '—', reg: '—' },
      subtitle: 'Ground rules of the Plasma Forest',
      intro: String.raw`You stand at the edge of the Plasma Forest. <b>Every path is an assumption. Every clearing is the wave (or oscillation) that those assumptions allow.</b> Nothing is wiggling yet: this is a cold, quiet, uniform plasma.`,
      assume: [
        String.raw`Infinite, uniform, quasi-neutral plasma: $n_{i0}=n_{e0}=n_0$, no gradients, no equilibrium flows.`,
        String.raw`<b>Linear</b>: every quantity is equilibrium + small perturbation, $n=n_0+n_1$; products of perturbations are dropped.`,
        String.raw`<b>Plane waves</b>: $n_1\propto e^{i(\mathbf k\cdot\mathbf r-\omega t)}$, so $\partial_t\to-i\omega$ and $\nabla\to i\mathbf k$.`,
        String.raw`No collisions. Fluid (not kinetic) description.`,
        String.raw`We <b>start</b> as bare as possible: cold ($T=0$), ions infinitely heavy, no background field $\mathbf B_0$. Each fork adds back one piece of physics.`
      ],
      steps: [],
      result: null,
      owNote: String.raw`Two speeds matter everywhere in this forest:
        <ul>
          <li><b>Phase velocity</b> $v_\phi=\omega/k$: how fast the crests move.</li>
          <li><b>Group velocity</b> $v_g=\partial\omega/\partial k$: how fast a <i>disturbance</i> (energy, information, the envelope of a packet) moves.</li>
        </ul>
        If $\omega$ does not depend on $k$, then $v_g=0$. Every bit of plasma rings at its own natural frequency, unaware of its neighbours. Crests can <i>appear</i> to slide by, like a stadium wave made of independent pendulums, but nothing is carried anywhere. That is an <b class="osc">OSCILLATION</b>.<br><br>
        If $v_g\neq0$, each piece pushes on its neighbours and a disturbance travels. That is a <b class="wave">WAVE</b>.<br><br>
        Every clearing has a portal. Put it in <b>PACKET</b> mode to see which one you're looking at.`,
      picture: String.raw`The trail you take the first time is fixed. Once you finish it, the whole forest opens: every fork is unlocked, and you can fast-travel from the map (<kbd>M</kbd>). Keys: <kbd>1</kbd>–<kbd>9</kbd> pick a path, <kbd>P</kbd> toggles packet / plane wave.`,
      disp: null,
      vis: { type: 'idle' }
    },

    /* --------------------------------------------------------------- */
    PO: {
      name: 'Plasma Oscillation', short: 'PLASMA OSC.', kind: 'osc', pos: [3.6, 1.35],
      dials: { Te: 'cold (T = 0)', ions: 'fixed', B0: 'none', Ek: '∥ k (electrostatic)', EB: '—', reg: 'any ω' },
      subtitle: 'a.k.a. the Langmuir oscillation',
      intro: String.raw`A slab of electrons has been shoved sideways. The ions are too heavy to care, so they stay put, and the exposed charge pulls the electrons back.`,
      assume: [
        String.raw`Cold electrons, $T_e=0$ (no pressure)`,
        String.raw`Ions immobile (uniform $+$ background)`,
        String.raw`No background field, $\mathbf B_0=0$`,
        String.raw`Electrostatic, longitudinal: $\mathbf E_1\parallel\mathbf k$`
      ],
      steps: [
        String.raw`Electron momentum (cold, no pressure): $\;m\,\partial_t\mathbf v_1=-e\mathbf E_1\;\Rightarrow\;-i\omega m v_1=-eE_1$`,
        String.raw`Electron continuity: $\;\partial_t n_1+n_0\nabla\!\cdot\!\mathbf v_1=0\;\Rightarrow\;-i\omega n_1+ikn_0v_1=0$`,
        String.raw`Poisson (ions are a fixed background): $\;\epsilon_0\nabla\!\cdot\!\mathbf E_1=-en_1\;\Rightarrow\;ik\epsilon_0E_1=-en_1$`,
        String.raw`Eliminate $v_1$ and $E_1$: $\;\omega^2 n_1 = \dfrac{n_0e^2}{\epsilon_0 m}\,n_1$. The $k$ cancels out completely.`
      ],
      result: String.raw`\omega^2=\omega_{pe}^2\equiv\frac{n_0e^2}{\epsilon_0 m}`,
      owNote: String.raw`<b class="osc">OSCILLATION.</b> $\omega$ has no $k$ in it, so $v_g=\partial\omega/\partial k=0$. Each slab of electrons is a mass on a spring (the spring is the charge-separation field), and in a cold plasma nothing couples one slab to the next.<br><br>In plane-wave mode the crests appear to march along at $v_\phi=\omega_{pe}/k$. Switch to <b>PACKET</b>: the packet never leaves home.`,
      picture: String.raw`Displacing electrons by $\xi$ uncovers a sheet of ion charge, which makes a field $E=en_0\xi/\epsilon_0$ pulling them back. They overshoot and ring at $\omega_{pe}$, so $f_{pe}\approx 9\sqrt{n_e[\mathrm{m^{-3}}]}$ Hz, about 9 GHz for $n_e=10^{18}\,\mathrm{m^{-3}}$. This is the most basic timescale in a plasma.<br><br>Try the loop-back path <i>“Add B₀ ∥ k”</i>: the electrons move along $\mathbf B_0$, so $\mathbf v\times\mathbf B_0=0$ and nothing changes.`,
      disp: {
        xLabel: 'k  (any units — ω doesn’t care)', yLabel: 'ω / ω_pe', kMax: 3, wMax: 2, vUnit: '',
        branches: [{ name: 'ω = ω_pe', fn: k => 1 }],
        refs: [], k0: 1.2
      },
      vis: { type: 'long', hot: false, ionsMove: false, nl: 5 }
    },

    /* --------------------------------------------------------------- */
    LW: {
      name: 'Langmuir Wave', short: 'LANGMUIR', kind: 'wave', pos: [2.05, 1.05],
      dials: { Te: 'hot electrons', ions: 'fixed', B0: 'none', Ek: '∥ k (electrostatic)', EB: '—', reg: 'kλ_De ≪ 1' },
      subtitle: 'Electron plasma wave · Bohm–Gross dispersion',
      intro: String.raw`The electrons are hot now. Hot electrons have <b>pressure</b>, and pressure pushes on the neighbours.`,
      assume: [
        String.raw`<span class="new">Hot electrons, $T_e\neq0$</span>: adiabatic, 1-D compression, $\gamma_e=3$`,
        String.raw`Ions immobile`,
        String.raw`$\mathbf B_0=0$`,
        String.raw`Electrostatic, $\mathbf E_1\parallel\mathbf k$`,
        String.raw`$k\lambda_{De}\ll1$ (otherwise Landau damping, a kinetic effect, wipes the wave out)`
      ],
      steps: [
        String.raw`Momentum now includes a pressure term: $\;mn_0\,\partial_t v_1=-en_0E_1-\gamma_eKT_e\,\partial_x n_1$`,
        String.raw`Fourier: $\;-i\omega mn_0v_1=-en_0E_1-3KT_e\,ik\,n_1$`,
        String.raw`Continuity and Poisson are unchanged: $\;n_1=\dfrac{kn_0}{\omega}v_1,\quad ik\epsilon_0E_1=-en_1$`,
        String.raw`Eliminate: $\;\omega^2=\omega_{pe}^2+\dfrac{3KT_e}{m}k^2$`
      ],
      result: String.raw`\omega^2=\omega_{pe}^2+3k^2\frac{KT_e}{m}=\omega_{pe}^2\left(1+3k^2\lambda_{De}^2\right)`,
      owNote: String.raw`<b class="wave">WAVE.</b> $v_g=\dfrac{3k\,KT_e/m}{\omega}\neq0$. The thermal term is the only thing that lets it travel, and it vanishes as $T_e\to0$ or $k\to0$, where you recover the plasma oscillation. Note $v_\phi v_g=3KT_e/m$: at small $k$ the crests race along while the packet barely creeps. Watch the packet drift slowly in the portal, then raise $k_0$.`,
      picture: String.raw`Electrons streaming out of a compressed region carry the news of the disturbance into the next region. That coupling between neighbours is what turns an oscillation into a wave. <b>Minimal ingredient: pressure.</b>`,
      disp: {
        xLabel: 'k λ_De', yLabel: 'ω / ω_pe', kMax: 1, wMax: 2.2, vUnit: 'v_te',
        vUnitNote: 'v_te ≡ √(KT_e/m)',
        branches: [{ name: 'Bohm–Gross', fn: k => Math.sqrt(1 + 3 * k * k) }],
        refs: [{ type: 'h', w: 1, label: 'ω_pe' }, { type: 'line', slope: Math.sqrt(3), label: 'ω = √3 k v_te' }],
        k0: 0.3
      },
      vis: { type: 'long', hot: true, ionsMove: false, nl: 5 }
    },

    /* --------------------------------------------------------------- */
    IA: {
      name: 'Ion Acoustic Wave', short: 'ION ACOUSTIC', kind: 'wave', pos: [0.75, 2.05],
      dials: { Te: 'hot e⁻, Tₑ ≫ Tᵢ', ions: 'mobile', B0: 'none', Ek: '∥ k (electrostatic)', EB: '—', reg: 'ω ≪ k v_te' },
      subtitle: 'Sound without collisions',
      intro: String.raw`The ions are free now, and we've dropped to frequencies far below $\omega_{pe}$. The light electrons keep up instantly with whatever the slow ions do.`,
      assume: [
        String.raw`<span class="new">Ions mobile</span> (mass $M$); they can even be cold, $T_i=0$`,
        String.raw`Hot electrons with $\omega\ll kv_{te}$: they are isothermal and <b>Boltzmann</b> (inertia negligible)`,
        String.raw`$T_e\gg T_i$, so the wave isn't Landau-damped away`,
        String.raw`$\mathbf B_0=0$, electrostatic $\mathbf E_1=-\nabla\phi_1\parallel\mathbf k$`
      ],
      steps: [
        String.raw`Massless electrons: $\;0=en_0\nabla\phi_1-KT_e\nabla n_{e1}\;\Rightarrow\;n_{e1}=n_0\dfrac{e\phi_1}{KT_e}$ (Boltzmann)`,
        String.raw`Cold ions: $\;-i\omega Mv_{i1}=-ike\phi_1,\qquad -i\omega n_{i1}+ikn_0v_{i1}=0$`,
        String.raw`Poisson: $\;\epsilon_0k^2\phi_1=e\,(n_{i1}-n_{e1})$`,
        String.raw`Eliminate: $\;\omega^2=\dfrac{k^2 KT_e/M}{1+k^2\lambda_{De}^2}$. For $k\lambda_{De}\ll1$ (quasi-neutral, $n_{i1}\approx n_{e1}$): $\omega=kc_s$`
      ],
      result: String.raw`\omega=k\,c_s,\qquad c_s=\sqrt{\frac{KT_e}{M}}\quad(k\lambda_{De}\ll1)`,
      owNote: String.raw`<b class="wave">WAVE</b>, and an <i>acoustic</i> one: $\omega\to0$ as $k\to0$, with $v_g=v_\phi=c_s$, so it's non-dispersive at long wavelength. At short wavelength ($k\lambda_{De}\gg1$) the curve flattens to $\omega\to\omega_{pi}$ and $v_g\to0$: an <b>ion plasma oscillation</b>. It's the same story as the electron branch, turned upside-down.`,
      picture: String.raw`The <b>electrons supply the pressure</b> ($T_e$), the <b>ions supply the inertia</b> ($M$), and the electric field ties the two together. Ordinary sound in a gas needs collisions to pass momentum along; here the field does that job. Watch the jittery hot electrons tag along with the heavy ions.`,
      disp: {
        xLabel: 'k λ_De', yLabel: 'ω / ω_pi', kMax: 4, wMax: 1.4, vUnit: 'c_s',
        branches: [{ name: 'ion acoustic', fn: k => k / Math.sqrt(1 + k * k) }],
        refs: [{ type: 'line', slope: 1, label: 'ω = k c_s' }, { type: 'h', w: 1, label: 'ω_pi' }],
        k0: 0.5
      },
      vis: { type: 'ia', nl: 5 }
    },

    /* --------------------------------------------------------------- */
    EIC: {
      name: 'Electrostatic Ion Cyclotron Wave', short: 'ION CYCLOTRON', kind: 'wave', pos: [0.75, 4.45],
      dials: { Te: 'hot e⁻', ions: 'mobile', B0: 'almost ⊥ k', Ek: '∥ k (electrostatic)', EB: '⊥ B₀', reg: 'small k∥ ≠ 0' },
      subtitle: 'Ion acoustic + gyration',
      intro: String.raw`A magnetic field now runs through the clearing, almost perpendicular to $\mathbf k$. The ions start to gyrate.`,
      assume: [
        String.raw`Everything from the ion acoustic wave (mobile ions, Boltzmann electrons)`,
        String.raw`<span class="new">Uniform $\mathbf B_0=B_0\hat z$</span>`,
        String.raw`$\mathbf k$ <b>almost</b> $\perp\mathbf B_0$: a small $k_\parallel$ lets electrons stream along $\mathbf B_0$, so they stay Boltzmann`,
        String.raw`Electrostatic, $\mathbf E_1=-\nabla\phi_1$`
      ],
      steps: [
        String.raw`Ion momentum with the Lorentz force: $\;M\partial_t\mathbf v_{i1}=-e\nabla\phi_1+e\,\mathbf v_{i1}\times\mathbf B_0$`,
        String.raw`$y$-component: $\;v_{iy}=-i\dfrac{\Omega_c}{\omega}v_{ix}$. Then $x$-component: $\;v_{ix}=\dfrac{ek\phi_1}{M\omega}\left(1-\dfrac{\Omega_c^2}{\omega^2}\right)^{-1}$`,
        String.raw`Ion continuity $n_{i1}=n_0kv_{ix}/\omega$, Boltzmann electrons, quasi-neutrality $n_{i1}=n_{e1}$`,
        String.raw`$\Rightarrow\;\omega^2-\Omega_c^2=k^2\dfrac{KT_e}{M}$`
      ],
      result: String.raw`\omega^2=\Omega_c^2+k^2v_s^2,\qquad\Omega_c=\frac{eB_0}{M},\quad v_s^2=\frac{KT_e+\gamma_iKT_i}{M}`,
      owNote: String.raw`<b class="wave">WAVE.</b> $v_g=kv_s^2/\omega\neq0$. At $k\to0$ it becomes a pure ion-cyclotron <i>oscillation</i> at $\Omega_c$; the acoustic (pressure) coupling is what lets it travel. Same pattern as Langmuir: <b>restoring force + pressure ⇒ wave</b>.`,
      picture: String.raw`Each ion now has two restoring effects: the acoustic push from electron pressure and the Lorentz force that turns it around in a gyro-orbit. In the portal, ions trace ellipses in the plane ⊥ $\mathbf B_0$ (⊙ = out of the screen).`,
      disp: {
        xLabel: 'k ρ_s', yLabel: 'ω / Ω_ci', kMax: 3, wMax: 3.4, vUnit: 'v_s',
        branches: [{ name: 'EIC', fn: k => Math.sqrt(1 + k * k) }],
        refs: [{ type: 'h', w: 1, label: 'Ω_ci' }, { type: 'line', slope: 1, label: 'ω = k v_s' }],
        k0: 1.0
      },
      vis: { type: 'ellipse', which: 'EIC', nl: 3 }
    },

    /* --------------------------------------------------------------- */
    LH: {
      name: 'Lower Hybrid Oscillation', short: 'LOWER HYBRID', kind: 'osc', pos: [2.15, 5.6],
      dials: { Te: 'cold (T = 0)', ions: 'mobile', B0: 'exactly ⊥ k', Ek: '∥ k (electrostatic)', EB: '⊥ B₀', reg: 'Ω_ci < ω ≪ ω_ce' },
      subtitle: 'The geometric mean of two cyclotron frequencies',
      intro: String.raw`Now $\mathbf k$ is <i>exactly</i> perpendicular to $\mathbf B_0$. The electrons have lost their escape route along the field lines.`,
      assume: [
        String.raw`<span class="new">$k_\parallel=0$ exactly</span>: electrons can no longer short out charge by streaming along $\mathbf B_0$`,
        String.raw`<span class="new">Cold</span> electrons and ions ($T=0$); pressure isn't needed any more`,
        String.raw`Mobile ions, $\mathbf B_0\perp\mathbf k$, electrostatic $\mathbf E_1\parallel\mathbf k$`
      ],
      steps: [
        String.raw`Any cold species $s$ in the plane ⊥ $\mathbf B_0$ with $\mathbf E_1=E\hat x$: $\;v_{sx}=\dfrac{iq_s\omega E}{m_s(\omega^2-\omega_{cs}^2)}$`,
        String.raw`Continuity + Poisson summed over species: $\;1=\displaystyle\sum_s\frac{\omega_{ps}^2}{\omega^2-\omega_{cs}^2}\;$ (i.e. $\epsilon_\perp=0$)`,
        String.raw`Keep both species with $\Omega_c\ll\omega\ll\omega_c$: electron term $\to-\omega_{pe}^2/\omega_{ce}^2$`,
        String.raw`$\Rightarrow\;\omega^2=\Omega_c^2+\dfrac{\omega_{pi}^2}{1+\omega_{pe}^2/\omega_{ce}^2}\;\xrightarrow{\text{dense}}\;\Omega_c\,\omega_c$`
      ],
      result: String.raw`\omega_{LH}^2=\Omega_c^2+\frac{\omega_{pi}^2}{1+\omega_{pe}^2/\omega_{ce}^2}\;\approx\;\Omega_c\,\omega_c`,
      owNote: String.raw`<b class="osc">OSCILLATION.</b> No $k$ in the result, so $v_g=0$. Add back a little temperature or a small $k_\parallel$ and it becomes a propagating lower-hybrid <i>wave</i>, which is used to heat and drive current in tokamaks.`,
      picture: String.raw`Electrons are tied to field lines and can only $\mathbf E\times\mathbf B$-drift (the big vertical swings in the portal). Ions are too heavy to feel much of $\mathbf B_0$ at this frequency, so they slosh nearly straight along $\mathbf k$. Charge piles up because the two species respond so differently, and that mismatch sets $\omega_{LH}$.<br><br>This is the second root of the same equation that gives the <b>upper hybrid</b> oscillation; follow the path to freeze the ions.`,
      disp: {
        xLabel: 'k  (any units)', yLabel: 'ω / ω_LH', kMax: 3, wMax: 2, vUnit: '',
        branches: [{ name: 'ω = ω_LH', fn: k => 1 }], refs: [], k0: 1.2
      },
      vis: { type: 'ellipse', which: 'LH', nl: 3 }
    },

    /* --------------------------------------------------------------- */
    UH: {
      name: 'Upper Hybrid Oscillation', short: 'UPPER HYBRID', kind: 'osc', pos: [3.6, 4.0],
      dials: { Te: 'cold (T = 0)', ions: 'fixed', B0: '⊥ k', Ek: '∥ k (electrostatic)', EB: '⊥ B₀', reg: 'any ω' },
      subtitle: 'Two springs in parallel',
      intro: String.raw`High frequency again, with the ions frozen. $\mathbf B_0$ is still perpendicular to $\mathbf k$, so the electrons feel the Lorentz force as they slosh.`,
      assume: [
        String.raw`Cold electrons, <span class="new">immobile ions</span>`,
        String.raw`$\mathbf B_0=B_0\hat z\perp\mathbf k$`,
        String.raw`Electrostatic, $\mathbf E_1\parallel\mathbf k$ (along $\hat x$)`
      ],
      steps: [
        String.raw`Momentum: $\;m\,\partial_t\mathbf v_1=-e\mathbf E_1-e\,\mathbf v_1\times\mathbf B_0$`,
        String.raw`Components: $\;-i\omega mv_x=-eE_x-ev_yB_0,\qquad -i\omega mv_y=+ev_xB_0$`,
        String.raw`Solve: $\;v_x=\dfrac{eE_x}{i m\omega}\left(1-\dfrac{\omega_c^2}{\omega^2}\right)^{-1}$`,
        String.raw`Continuity + Poisson exactly as for the plasma oscillation: $\;\left(1-\dfrac{\omega_c^2}{\omega^2}\right)\omega^2=\omega_{pe}^2$`
      ],
      result: String.raw`\omega^2=\omega_{pe}^2+\omega_{ce}^2\equiv\omega_h^2`,
      owNote: String.raw`<b class="osc">OSCILLATION.</b> Still no $k$ in the result, so $v_g=0$. It's the plasma oscillation made stiffer: the electrostatic spring and the magnetic (Lorentz) spring act in parallel, so their squared frequencies add.`,
      picture: String.raw`Electrons trace ellipses in the plane ⊥ $\mathbf B_0$, with axis ratio $v_y/v_x=\omega_c/\omega$. If instead $\mathbf k\parallel\mathbf B_0$, the motion is along $\mathbf B_0$ and you're back to plain $\omega_{pe}$.<br><br>Make it electromagnetic and the upper hybrid frequency reappears as the <b>resonance of the X wave</b>.`,
      disp: {
        xLabel: 'k  (any units)', yLabel: 'ω / ω_pe', kMax: 3, wMax: 2, vUnit: '',
        branches: [{ name: 'ω = ω_UH', fn: k => WUH }],
        refs: [{ type: 'h', w: 1, label: 'ω_pe' }, { type: 'h', w: WC, label: 'ω_ce' }], k0: 1.2
      },
      vis: { type: 'ellipse', which: 'UH', nl: 3 }
    },

    /* --------------------------------------------------------------- */
    X: {
      name: 'Extraordinary (X) Wave', short: 'X WAVE', kind: 'wave', pos: [6.4, 4.6],
      dials: { Te: 'cold (T = 0)', ions: 'fixed', B0: '⊥ k', Ek: 'mixed (EM)', EB: '⊥ B₀', reg: 'any ω' },
      subtitle: 'k ⊥ B₀, E₁ ⊥ B₀: elliptically polarized',
      intro: String.raw`We let the field breathe. $\mathbf E_1$ stays ⊥ $\mathbf B_0$, but it can now have a transverse part, and we keep $\partial\mathbf B/\partial t$. Light and the upper hybrid oscillation are about to merge.`,
      assume: [
        String.raw`Cold electrons, immobile ions`,
        String.raw`$\mathbf B_0\perp\mathbf k$; $\;\mathbf E_1\perp\mathbf B_0$ with <b>both</b> $E_x$ (along $\mathbf k$) and $E_y$ (across $\mathbf k$)`,
        String.raw`<span class="new">Electromagnetic</span>: full Maxwell, $\nabla\times\mathbf E=-\partial_t\mathbf B$ and Ampère with displacement current`
      ],
      steps: [
        String.raw`Wave equation: $\;(\omega^2-c^2k^2)\mathbf E_1+c^2\mathbf k(\mathbf k\cdot\mathbf E_1)=-\dfrac{i\omega}{\epsilon_0}\mathbf j_1,\quad\mathbf j_1=-en_0\mathbf v_1$`,
        String.raw`Electron velocities with $\mathbf B_0$ (as at the upper hybrid), now driven by both $E_x$ and $E_y$`,
        String.raw`Two coupled equations for $E_x,E_y$. Setting the determinant to zero gives:`
      ],
      result: String.raw`\frac{c^2k^2}{\omega^2}=1-\frac{\omega_p^2}{\omega^2}\,\frac{\omega^2-\omega_p^2}{\omega^2-\omega_h^2}`,
      extra: String.raw`Cutoffs ($k\to0$): $\;\omega_{R,L}=\tfrac12\left[\sqrt{\omega_c^2+4\omega_p^2}\pm\omega_c\right]$.<br>Resonance ($k\to\infty$): $\;\omega=\omega_h$, the upper hybrid frequency.`,
      owNote: String.raw`<b class="wave">WAVE</b>, with structure. On the lower branch, drag $k_0$ upward: as $\omega\to\omega_h$, $k\to\infty$ and $v_g\to0$, and the packet stalls. At its resonance the X wave <i>becomes</i> the upper-hybrid <b>oscillation</b> you just left. Waves and oscillations are the same physics seen at different $k$.`,
      picture: String.raw`Polarization is elliptical: the $E_x$ (longitudinal) part grows near the resonance. Watch the arrows in the portal tip sideways as you increase $k_0$. Used for electron-cyclotron heating and for ECE temperature diagnostics in fusion devices.`,
      disp: {
        xLabel: 'k c / ω_pe', yLabel: 'ω / ω_pe', kMax: 3, wMax: 3.4, vUnit: 'c',
        branches: [
          { name: 'lower X', n2: n2X, wr: [WL + 1e-5, WUH - 1e-6] },
          { name: 'upper X', n2: n2X, wr: [WR + 1e-5, 8] }
        ],
        refs: [{ type: 'line', slope: 1, label: 'ω = ck' }, { type: 'h', w: WL, label: 'ω_L' },
               { type: 'h', w: WUH, label: 'ω_UH  (resonance)', side: 'left' }, { type: 'h', w: WR, label: 'ω_R' }],
        k0: 1.0
      },
      vis: { type: 'xwave', nl: 5 }
    },

    /* --------------------------------------------------------------- */
    O: {
      name: 'Ordinary (O) Wave', short: 'O WAVE', kind: 'wave', pos: [8.45, 3.6],
      dials: { Te: 'cold (T = 0)', ions: 'fixed', B0: '⊥ k', Ek: '⊥ k (EM)', EB: '∥ B₀', reg: 'any ω' },
      subtitle: 'k ⊥ B₀, E₁ ∥ B₀',
      intro: String.raw`Rotate $\mathbf E_1$ so it points along $\mathbf B_0$. The electrons get pushed along the field lines, where the field has no grip on them.`,
      assume: [
        String.raw`Cold electrons, immobile ions`,
        String.raw`$\mathbf B_0\perp\mathbf k$, <span class="new">$\mathbf E_1\parallel\mathbf B_0$</span> (so $\mathbf E_1\perp\mathbf k$: transverse)`,
        String.raw`Electromagnetic`
      ],
      steps: [
        String.raw`$\mathbf E_1\parallel\mathbf B_0\Rightarrow\mathbf v_1\parallel\mathbf B_0\Rightarrow\mathbf v_1\times\mathbf B_0=0$`,
        String.raw`Electron response is unmagnetized: $\;-i\omega m\mathbf v_1=-e\mathbf E_1$`,
        String.raw`Transverse wave equation: $\;(\omega^2-c^2k^2)\mathbf E_1=\omega_{pe}^2\mathbf E_1$`
      ],
      result: String.raw`\omega^2=\omega_{pe}^2+c^2k^2`,
      owNote: String.raw`<b class="wave">WAVE</b>, <i>identical</i> to light in an unmagnetized plasma. $v_g=c^2k/\omega$. Below $\omega_{pe}$ it's cut off (evanescent). The O wave doesn't know $\mathbf B_0$ is there.`,
      picture: String.raw`“Ordinary” because $\mathbf B_0$ changes nothing. Compare its dispersion with the X wave: same $\mathbf k$, same $\mathbf B_0$, different polarization, completely different physics. That difference makes a magnetized plasma <b>birefringent</b>.`,
      disp: {
        xLabel: 'k c / ω_pe', yLabel: 'ω / ω_pe', kMax: 3, wMax: 3.4, vUnit: 'c',
        branches: [{ name: 'O wave', fn: k => Math.sqrt(1 + k * k) }],
        refs: [{ type: 'line', slope: 1, label: 'ω = ck' }, { type: 'h', w: 1, label: 'ω_pe  (cutoff)' }],
        k0: 0.8
      },
      vis: { type: 'trans', bAlongE: true, nl: 5 }
    },

    /* --------------------------------------------------------------- */
    LIGHT: {
      name: 'Light Wave in a Plasma', short: 'LIGHT WAVE', kind: 'wave', pos: [6.6, 1.35],
      dials: { Te: 'cold (T = 0)', ions: 'fixed', B0: 'none', Ek: '⊥ k (EM)', EB: '—', reg: 'any ω' },
      subtitle: 'Electromagnetic wave, B₀ = 0',
      intro: String.raw`No background field at all. A transverse electromagnetic wave enters the plasma and shakes the electrons sideways.`,
      assume: [
        String.raw`Cold electrons, immobile ions, $\mathbf B_0=0$`,
        String.raw`<span class="new">Transverse</span> $\mathbf E_1\perp\mathbf k$, with full Maxwell (electromagnetic)`
      ],
      steps: [
        String.raw`Faraday: $\;i\mathbf k\times\mathbf E_1=i\omega\mathbf B_1$`,
        String.raw`Ampère: $\;ic^2\mathbf k\times\mathbf B_1=\mathbf j_1/\epsilon_0-i\omega\mathbf E_1,\qquad\mathbf j_1=-en_0\mathbf v_1$`,
        String.raw`Electrons: $\;-i\omega m\mathbf v_1=-e\mathbf E_1$`,
        String.raw`Combine (using $\mathbf k\cdot\mathbf E_1=0$): $\;(\omega^2-c^2k^2)\mathbf E_1=\omega_{pe}^2\mathbf E_1$`
      ],
      result: String.raw`\omega^2=\omega_{pe}^2+c^2k^2`,
      owNote: String.raw`<b class="wave">WAVE.</b> $v_g=c^2k/\omega<c$ and $v_\phi>c$, with $v_\phi v_g=c^2$. Compare Bohm–Gross: it has the same shape with $3KT_e/m\to c^2$. At the bottom of the curve ($k\to0$) the wave sits at $\omega_{pe}$ with $v_g=0$: the cutoff is where it turns into the plasma oscillation.`,
      picture: String.raw`For $\omega<\omega_{pe}$, $k$ is imaginary and the wave can't propagate; it reflects. That's why the ionosphere bounces AM and shortwave radio back to Earth, and why microwave interferometers can measure plasma density.`,
      disp: {
        xLabel: 'k c / ω_pe', yLabel: 'ω / ω_pe', kMax: 3, wMax: 3.4, vUnit: 'c',
        branches: [{ name: 'EM wave', fn: k => Math.sqrt(1 + k * k) }],
        refs: [{ type: 'line', slope: 1, label: 'ω = ck (vacuum)' }, { type: 'h', w: 1, label: 'ω_pe  (cutoff)' }],
        k0: 0.8
      },
      vis: { type: 'trans', bAlongE: false, nl: 5 }
    },

    /* --------------------------------------------------------------- */
    R: {
      name: 'R Wave & Whistler', short: 'R WAVE', kind: 'wave', pos: [6.95, 6.35],
      dials: { Te: 'cold (T = 0)', ions: 'fixed', B0: '∥ k', Ek: '⊥ k (EM)', EB: 'R-circular', reg: 'any ω' },
      subtitle: 'Right-hand circular, k ∥ B₀',
      intro: String.raw`$\mathbf B_0$ now points along $\mathbf k$. $\mathbf E_1$ spins in the <b>same sense the electrons gyrate</b>.`,
      assume: [
        String.raw`Cold electrons, immobile ions`,
        String.raw`<span class="new">$\mathbf B_0\parallel\mathbf k$</span>`,
        String.raw`Transverse $\mathbf E_1$, <span class="new">right-hand circularly polarized</span> (co-rotating with electrons)`,
        String.raw`Electromagnetic`
      ],
      steps: [
        String.raw`Transverse wave equation: $\;(\omega^2-c^2k^2)\mathbf E_1=-i\omega\mathbf j_1/\epsilon_0$`,
        String.raw`Circular components $E_\pm=E_x\pm iE_y$ decouple; electrons respond as $\;\propto\left(1\mp\omega_c/\omega\right)^{-1}$`,
        String.raw`Co-rotating (R) component:`
      ],
      result: String.raw`n^2=\frac{c^2k^2}{\omega^2}=1-\frac{\omega_p^2/\omega^2}{1-\omega_c/\omega}`,
      extra: String.raw`Resonance at $\omega=\omega_c$ (electron cyclotron). Cutoff at $\omega_R$.<br><b>Whistler</b> branch ($\omega\ll\omega_c$): $\;\omega\approx\dfrac{k^2c^2\omega_c}{\omega_p^2}$.`,
      owNote: String.raw`<b class="wave">WAVE</b>, with two branches. On the whistler branch $v_g\approx2v_\phi\propto\sqrt\omega$: higher frequencies outrun lower ones. A lightning flash on the other side of the planet arrives as a <b>descending whistle</b>. Near $\omega_c$ the wave co-rotates with the electrons, pumps energy into them continuously, and $v_g\to0$ (the electron cyclotron resonance).`,
      picture: String.raw`The portal shows the $\mathbf E_1$ vector rotating around $\mathbf B_0$ (along the screen). At any fixed point it turns right-handedly about $\mathbf B_0$, the same way the electrons gyrate. Careful: frozen in time, the same field traces a <i>left</i>-handed corkscrew in space, because the pattern depends on $kz-\omega t$. Only the electrons (cyan) are shown, because they are the species this wave can resonate with, at $\omega_c$.`,
      disp: {
        xLabel: 'k c / ω_pe', yLabel: 'ω / ω_pe', kMax: 3, wMax: 3.4, vUnit: 'c',
        branches: [
          { name: 'whistler', n2: n2R, wr: [0.002, WC - 1e-6] },
          { name: 'upper R', n2: n2R, wr: [WR + 1e-5, 8] }
        ],
        refs: [{ type: 'line', slope: 1, label: 'ω = ck' }, { type: 'h', w: WC, label: 'ω_ce  (resonance)' },
               { type: 'h', w: WR, label: 'ω_R  (cutoff)' }],
        k0: 1.0
      },
      vis: { type: 'helix', hand: 1, nl: 5 }
    },

    /* --------------------------------------------------------------- */
    L: {
      name: 'L Wave', short: 'L WAVE', kind: 'wave', pos: [9.0, 5.95],
      dials: { Te: 'cold (T = 0)', ions: 'fixed', B0: '∥ k', Ek: '⊥ k (EM)', EB: 'L-circular', reg: 'any ω' },
      subtitle: 'Left-hand circular, k ∥ B₀',
      intro: String.raw`Same geometry, but $\mathbf E_1$ now spins <b>against</b> the electron gyration.`,
      assume: [
        String.raw`Cold electrons, immobile ions, $\mathbf B_0\parallel\mathbf k$`,
        String.raw`Transverse $\mathbf E_1$, <span class="new">left-hand circular</span> (counter-rotating to electrons)`,
        String.raw`Electromagnetic`
      ],
      steps: [
        String.raw`Same wave equation as the R wave, but keep the other circular component $E_-$`,
        String.raw`Electrons respond as $\;\propto(1+\omega_c/\omega)^{-1}$: no singularity for $\omega>0$`
      ],
      result: String.raw`n^2=\frac{c^2k^2}{\omega^2}=1-\frac{\omega_p^2/\omega^2}{1+\omega_c/\omega}`,
      extra: String.raw`Cutoff at $\omega_L$. <b>No electron resonance</b>. With mobile ions it would resonate at $\Omega_c$ (the ion cyclotron wave).`,
      owNote: String.raw`<b class="wave">WAVE.</b> One branch above $\omega_L$. A linearly polarized wave is R + L; since they have different $k$ at the same $\omega$, the plane of polarization rotates as it travels. That's <b>Faraday rotation</b>, used to measure $\int n_eB_\parallel\,dl$ in labs and in pulsar signals.`,
      picture: String.raw`Watch the helix in the portal turn the opposite way from the R wave's. The ions (orange) are shown here: this polarization turns the same way ions naturally gyrate, so if the ions were allowed to move, this wave would resonate at $\Omega_{ci}$ (the ion cyclotron wave).`,
      disp: {
        xLabel: 'k c / ω_pe', yLabel: 'ω / ω_pe', kMax: 3, wMax: 3.4, vUnit: 'c',
        branches: [{ name: 'L wave', n2: n2L, wr: [WL + 1e-5, 8] }],
        refs: [{ type: 'line', slope: 1, label: 'ω = ck' }, { type: 'h', w: WL, label: 'ω_L  (cutoff)' }],
        k0: 1.0
      },
      vis: { type: 'helix', hand: -1, nl: 5 }
    },

    /* --------------------------------------------------------------- */
    ALF: {
      name: 'Alfvén Wave', short: 'ALFVEN', kind: 'wave', pos: [8.6, 7.55],
      dials: { Te: 'cold (T = 0)', ions: 'mobile', B0: '∥ k', Ek: '⊥ k (EM)', EB: '⊥ B₀', reg: 'ω ≪ Ω_ci' },
      subtitle: 'Shear Alfvén wave: plucked field lines',
      intro: String.raw`Let the ions move and go to frequencies far below the ion cyclotron frequency. The plasma is now frozen to the field lines, and the field lines behave like strings.`,
      assume: [
        String.raw`<span class="new">Mobile ions</span>; cold is fine`,
        String.raw`<span class="new">$\omega\ll\Omega_c$</span> (low frequency)`,
        String.raw`$\mathbf B_0\parallel\mathbf k$, $\mathbf E_1\perp\mathbf B_0$ (transverse), electromagnetic`
      ],
      steps: [
        String.raw`At $\omega\ll\Omega_c$ both species $\mathbf E\times\mathbf B$-drift together, so their currents cancel`,
        String.raw`The ion polarization drift survives: $\;\mathbf v_p=\dfrac{1}{\Omega_cB_0}\partial_t\mathbf E_\perp\;\Rightarrow\;\mathbf j_1=\dfrac{\rho}{B_0^2}\partial_t\mathbf E_\perp$`,
        String.raw`This acts like a huge dielectric constant: $\;\epsilon_\perp=1+\dfrac{\rho}{\epsilon_0B_0^2}=1+\dfrac{c^2}{v_A^2}$`,
        String.raw`Transverse wave: $\;n^2=\epsilon_\perp\Rightarrow\dfrac{\omega}{k}=\dfrac{v_A}{\sqrt{1+v_A^2/c^2}}$`
      ],
      result: String.raw`\omega=k\,v_A,\qquad v_A=\frac{B_0}{\sqrt{\mu_0\rho}}`,
      owNote: String.raw`<b class="wave">WAVE</b>, non-dispersive: $v_g=v_\phi=v_A$, and energy flows along $\mathbf B_0$. The R and L waves both merge into this one at low frequency. It only holds for $\omega\ll\Omega_{ci}$, which is why the plot stops being trustworthy near $\Omega_{ci}$.`,
      picture: String.raw`The <b>tension</b> in a field line is $B_0^2/\mu_0$ and its <b>mass per volume</b> is $\rho$ (the ions frozen onto it). A wave on a string has speed $\sqrt{T/\rho}$, which gives $v_A$. Alfvén waves heat the solar corona and carry energy along Earth's magnetic field into the aurora.`,
      disp: {
        xLabel: 'k v_A / Ω_ci', yLabel: 'ω / Ω_ci', kMax: 1, wMax: 1.25, vUnit: 'v_A',
        branches: [{ name: 'Alfvén', fn: k => k }],
        refs: [{ type: 'h', w: 1, label: 'Ω_ci  (model breaks down)' }],
        k0: 0.3
      },
      vis: { type: 'string', nl: 3 }
    },

    /* --------------------------------------------------------------- */
    MS: {
      name: 'Magnetosonic Wave', short: 'MAGNETOSONIC', kind: 'wave', pos: [5.6, 7.55],
      dials: { Te: 'hot (p ≠ 0)', ions: 'mobile', B0: '⊥ k', Ek: '⊥ k (EM)', EB: '⊥ B₀', reg: 'ω ≪ Ω_ci' },
      subtitle: 'Fast compressional wave: squeezed field lines',
      intro: String.raw`Turn $\mathbf k$ perpendicular to $\mathbf B_0$. Now you squeeze the field lines together instead of plucking them.`,
      assume: [
        String.raw`Mobile ions, $\omega\ll\Omega_c$`,
        String.raw`<span class="new">$\mathbf k\perp\mathbf B_0$</span>; $\mathbf E_1\perp\mathbf B_0$ and $\perp\mathbf k$; electromagnetic`,
        String.raw`<span class="new">Finite pressure</span> ($T_e,T_i$). Set $T\to0$ and you get the <i>compressional Alfvén wave</i>, $\omega=kv_A$`
      ],
      steps: [
        String.raw`Geometry: $\mathbf k=k\hat x$, $\mathbf B_0=B_0\hat z$, $\mathbf E_1=E\hat y$. The $\mathbf E\times\mathbf B$ drift is along $\hat x$, along $\mathbf k$, so it <b>compresses</b> plasma and field together`,
        String.raw`Ion momentum now includes pressure: $\;Mn_0\partial_t\mathbf v_{i1}=en_0(\mathbf E_1+\mathbf v_{i1}\times\mathbf B_0)-\gamma_iKT_i\nabla n_1$ (plus Boltzmann-like electrons)`,
        String.raw`Combine with the low-frequency Ampère/Faraday as for the Alfvén wave:`
      ],
      result: String.raw`\frac{\omega^2}{k^2}=c^2\,\frac{v_s^2+v_A^2}{c^2+v_A^2}\;\approx\;v_A^2+v_s^2`,
      owNote: String.raw`<b class="wave">WAVE</b>: the fast magnetosonic wave, $v_g=\sqrt{v_A^2+v_s^2}$. Two springs in parallel again: <b>magnetic pressure</b> $B^2/2\mu_0$ plus <b>plasma pressure</b>. It's literally ion-acoustic sound with the magnetic field adding to the stiffness.`,
      picture: String.raw`In the portal, each vertical line is a $\mathbf B_0$ field line, with ions frozen onto it. Where the lines crowd together the field (and the density) is compressed, so they glow white; where they spread apart they fade to blue. Three roads lead here: the Alfvén wave rotated, the X wave at low frequency, and the ion acoustic wave with a perpendicular field added. Magnetosonic waves make up the bow shocks in front of planets and are launched to heat fusion plasmas (ICRF).`,
      disp: {
        xLabel: 'k v_A / Ω_ci', yLabel: 'ω / Ω_ci', kMax: 1, wMax: 1.4, vUnit: 'v_A',
        branches: [{ name: 'magnetosonic', fn: k => k * Math.sqrt(1 + VS_VA * VS_VA) }],
        refs: [{ type: 'line', slope: 1, label: 'ω = k v_A  (T→0)' }, { type: 'line', slope: VS_VA, label: 'ω = k v_s', at: 0.95 },
               { type: 'h', w: 1, label: 'Ω_ci' }],
        k0: 0.3
      },
      vis: { type: 'compress', nl: 3 }
    }
  };

  /* Edges are bidirectional: fwd = label shown at a, back = label shown at b. */
  const EDGES = [
    { a: 'START', b: 'PO',    fwd: 'Displace a slab of electrons',                 back: 'Return to the trailhead' },
    { a: 'PO',    b: 'LW',    fwd: 'Heat the electrons (Tₑ ≠ 0)',                  back: 'Cool the electrons (Tₑ → 0)' },
    { a: 'LW',    b: 'IA',    fwd: 'Let the ions move (low frequency)',             back: 'Freeze the ions (high frequency)' },
    { a: 'IA',    b: 'EIC',   fwd: 'Add B₀, with k almost ⊥ B₀',                   back: 'Remove B₀' },
    { a: 'EIC',   b: 'LH',    fwd: 'Make k exactly ⊥ B₀ (k∥ = 0), go cold',        back: 'Allow a small k∥, heat the electrons' },
    { a: 'LH',    b: 'UH',    fwd: 'Freeze the ions (high frequency)',              back: 'Let the ions move (lower frequency)' },
    { a: 'UH',    b: 'X',     fwd: 'Go electromagnetic (E₁ ⊥ B₀ gains a transverse part)', back: 'Go electrostatic (E₁ ∥ k only)' },
    { a: 'X',     b: 'O',     fwd: 'Rotate E₁ to be ∥ B₀',                          back: 'Rotate E₁ to be ⊥ B₀' },
    { a: 'O',     b: 'LIGHT', fwd: 'Remove B₀',                                     back: 'Add B₀ ⊥ k, with E₁ ∥ B₀' },
    { a: 'LIGHT', b: 'R',     fwd: 'Add B₀ ∥ k; spin E₁ right-handed',              back: 'Remove B₀' },
    { a: 'R',     b: 'L',     fwd: 'Flip E₁ to left-handed rotation',               back: 'Flip E₁ to right-handed rotation' },
    { a: 'L',     b: 'ALF',   fwd: 'Let the ions move, ω ≪ Ω_ci',                   back: 'Freeze the ions (high frequency)' },
    { a: 'ALF',   b: 'MS',    fwd: 'Rotate k ⊥ B₀ (and add pressure)',              back: 'Rotate k ∥ B₀ (drop pressure)' },
    /* cross-links, open after the first trail */
    { a: 'PO',    b: 'UH',    fwd: 'Add B₀ ⊥ k',                                    back: 'Remove B₀' },
    { a: 'PO',    b: 'LIGHT', fwd: 'Make E₁ transverse (E₁ ⊥ k, electromagnetic)',  back: 'Make E₁ longitudinal (E₁ ∥ k, electrostatic)' },
    { a: 'LIGHT', b: 'X',     fwd: 'Add B₀ ⊥ k, with E₁ ⊥ B₀',                      back: 'Remove B₀' },
    { a: 'X',     b: 'MS',    fwd: 'Let the ions move, ω ≪ Ω_ci (add pressure)',    back: 'Freeze the ions, high frequency, go cold' },
    { a: 'IA',    b: 'MS',    fwd: 'Add B₀ ⊥ k and let B compress (EM)',            back: 'Remove B₀ (back to electrostatic)' },
    { a: 'R',     b: 'ALF',   fwd: 'Let the ions move, ω ≪ Ω_ci',                   back: 'Freeze ions; R-polarized, high frequency' }
  ];

  /* Loop-back paths: adding something that changes nothing. */
  const SELF_LOOPS = {
    PO: [{ label: 'Add B₀ ∥ k', note: 'Electrons are pushed along B₀, so v × B₀ = 0. Nothing changes: still ω = ω_pe. You walked in a circle!' }],
    LW: [{ label: 'Add B₀ ∥ k', note: 'Electron motion is along B₀, so v × B₀ = 0. The Langmuir wave along B₀ is unchanged. You walked in a circle!' }],
    IA: [{ label: 'Add B₀ ∥ k', note: 'Ions slosh along B₀, so v × B₀ = 0. Ion acoustic waves propagate along B₀ unchanged. You walked in a circle!' }]
  };

  const GUIDED = ['START', 'PO', 'LW', 'IA', 'EIC', 'LH', 'UH', 'X', 'O', 'LIGHT', 'R', 'L', 'ALF', 'MS'];

  window.CYOW = { NODES, EDGES, SELF_LOOPS, GUIDED, DIAL_LABELS, PHYS };
})();
