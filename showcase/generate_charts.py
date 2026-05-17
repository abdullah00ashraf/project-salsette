import plotly.graph_objects as go
import numpy as np
import os

# Ensure we are saving in the same directory as the script
current_dir = os.path.dirname(os.path.abspath(__file__))

# ==========================================
# AESTHETIC PROTOCOL & GLOBAL THEME (OVELAP-PROOF)
# ==========================================
THEME = dict(
    paper_bgcolor='rgba(0,0,0,0)',
    plot_bgcolor='rgba(0,0,0,0)',
    font=dict(family="JetBrains Mono, sans-serif", color="#1A1A1A", size=10),
    margin=dict(l=60, r=40, t=110, b=100),  # Generous margins to prevent any text clipping
    legend=dict(
        orientation="h",
        yanchor="top",
        y=-0.25,  # Push legend far below the x-axis title
        xanchor="center",
        x=0.5
    )
)

AXIS_STYLE = dict(
    showgrid=True,
    gridcolor='rgba(0,0,0,0.05)',
    zeroline=True,
    zerolinecolor='rgba(0,0,0,0.1)',
    showline=False
)

# ==========================================
# CHART 1: THE PREDICTION PARADOX
# ==========================================
np.random.seed(42)
t_hours = np.arange(-48, 1)  # T-48 to T-0

# Baseline harmonic tide + noise
base_tide = 1.8 + np.sin(t_hours * 0.15) * 0.3 + np.random.normal(0, 0.05, len(t_hours))

# Simulate Black-Swan surge at T-12 (Index 36)
ground_truth = np.copy(base_tide)
surge_mask = t_hours >= -12
ground_truth[surge_mask] += (np.arange(len(ground_truth[surge_mask])) ** 1.3) * 0.1  # Surges to ~4.2m

# Legacy AI flatlines due to out-of-distribution data
legacy_ai = np.copy(base_tide)
legacy_ai[surge_mask] += np.linspace(0, 0.4, len(legacy_ai[surge_mask]))  # Flatlines at ~2.1m

# Bi-LSTM tracks ground truth closely
salsette = ground_truth * 0.94 + 0.12 + np.random.normal(0, 0.08, len(t_hours))

fig1 = go.Figure()
fig1.add_trace(go.Scatter(x=t_hours, y=ground_truth, name='Ground Truth (Surge)', 
                          line=dict(color='#1A1A1A', width=2, dash='dot')))
fig1.add_trace(go.Scatter(x=t_hours, y=legacy_ai, name='Legacy AI (Failure)', 
                          line=dict(color='#9e9e9e', width=3)))
fig1.add_trace(go.Scatter(x=t_hours, y=salsette, name='Salsette Bi-LSTM', 
                          line=dict(color='#00d2ff', width=3, shape='spline')))

fig1.update_layout(
    title=dict(
        text="<b>THE PREDICTION PARADOX</b><br><span style='font-size:11px;color:#666'>Mithi River Level during Black-Swan Event</span>",
        x=0.5,
        y=0.96,
        xanchor="center",
        yanchor="top"
    ),
    xaxis_title="Timeline (Hours to Impact)",
    yaxis_title="Water Level (Meters)",
    **THEME
)
fig1.update_xaxes(**AXIS_STYLE, tick0=-48, dtick=12)
fig1.update_yaxes(**AXIS_STYLE, range=[1, 4.5])
fig1.write_html(os.path.join(current_dir, "chart_paradox.html"), full_html=False, include_plotlyjs='cdn')

# ==========================================
# CHART 2: PHYSICAL CAGE CONVERGENCE
# ==========================================
epochs = np.arange(0, 101)

# Standard MSE: Drops initially, then overfits/spikes violently due to unphysical boundary conditions
mse_loss = np.exp(-epochs * 0.1) * 2.0 + 0.2
spike_start = 35
mse_loss[spike_start:] += np.exp((epochs[spike_start:] - spike_start) * 0.08) * 0.1 + np.random.normal(0, 0.8, len(epochs[spike_start:]))
mse_loss = np.clip(mse_loss, 0.01, 100) # Cap for aesthetic log scaling

# PDE Constraint Loss: Smooth, stable logarithmic decay 
pde_loss = np.exp(-epochs * 0.07) * 2.0 + 0.05 + np.random.normal(0, 0.02, len(epochs))

fig2 = go.Figure()
fig2.add_trace(go.Scatter(x=epochs, y=mse_loss, name='Standard MSE Loss', 
                          line=dict(color='#9e9e9e', width=2)))
fig2.add_trace(go.Scatter(x=epochs, y=pde_loss, name='PDE Constrained Loss', 
                          line=dict(color='#e53935', width=3, shape='spline')))

fig2.update_layout(
    title=dict(
        text="<b>PHYSICAL CAGE CONVERGENCE</b><br><span style='font-size:11px;color:#666'>Loss Surface Stability (Log Scale)</span>",
        x=0.5,
        y=0.96,
        xanchor="center",
        yanchor="top"
    ),
    xaxis_title="Training Epochs",
    yaxis_title="Loss Value",
    yaxis_type="log",
    **THEME
)
fig2.update_xaxes(**AXIS_STYLE)
fig2.update_yaxes(**AXIS_STYLE)
fig2.write_html(os.path.join(current_dir, "chart_convergence.html"), full_html=False, include_plotlyjs='cdn')

# ==========================================
# CHART 3: ARCHITECTURE AUDIT (RADAR)
# ==========================================
categories = ['Latency', 'Accuracy', 'Hardware Efficiency', 'Poisoning Resilience', 'Offline Uptime']

fig3 = go.Figure()
fig3.add_trace(go.Scatterpolar(
    r=[35, 65, 20, 15, 0],
    theta=categories,
    fill='toself',
    name='Legacy Cloud AI',
    line=dict(color='#9e9e9e'),
    fillcolor='rgba(158, 158, 158, 0.2)'
))
fig3.add_trace(go.Scatterpolar(
    r=[98, 94, 95, 90, 100],
    theta=categories,
    fill='toself',
    name='Konkan-Aegis INT8 Edge',
    line=dict(color='#00d2ff'),
    fillcolor='rgba(0, 210, 255, 0.2)'
))

# Radar-specific padding to prevent category labels from clipping
RADAR_THEME = dict(
    paper_bgcolor='rgba(0,0,0,0)',
    plot_bgcolor='rgba(0,0,0,0)',
    font=dict(family="JetBrains Mono, sans-serif", color="#1A1A1A", size=10),
    margin=dict(l=100, r=100, t=120, b=100),  # Extra side margins for radar labels
    legend=dict(
        orientation="h",
        yanchor="top",
        y=-0.2,
        xanchor="center",
        x=0.5
    )
)

fig3.update_layout(
    title=dict(
        text="<b>ARCHITECTURE AUDIT</b><br><span style='font-size:11px;color:#666'>Edge vs Cloud Redundancy Matrices</span>",
        x=0.5,
        y=0.96,
        xanchor="center",
        yanchor="top"
    ),
    polar=dict(
        radialaxis=dict(visible=True, range=[0, 100], showline=False, gridcolor='rgba(0,0,0,0.05)', tickcolor='rgba(0,0,0,0.05)'),
        angularaxis=dict(gridcolor='rgba(0,0,0,0.05)', linecolor='rgba(0,0,0,0.05)'),
        bgcolor='rgba(0,0,0,0)'
    ),
    **RADAR_THEME
)
fig3.write_html(os.path.join(current_dir, "chart_audit.html"), full_html=False, include_plotlyjs='cdn')

print("Overlap-Proof Offline Charts Generated Successfully.")
