---
title: Why Lagrangians Feel Like Cheating
description: >-
  Newton asks what forces act. Lagrange asks what the system is trying to do. The second
  question is easier, and it is not obvious why.
pubDate: 2026-08-18
tags: ['classical mechanics', 'method']
---

The first time you solve a constrained-motion problem with a Lagrangian, it feels like you
got away with something. The constraint forces — the ones that made the Newtonian version
tedious — simply never appear. You write down one scalar function, turn a crank, and the
equations of motion fall out.

That feeling is worth taking seriously rather than dismissing.

## What actually got eliminated

Start with the Lagrangian $\mathcal{L} = T - V$, the difference between kinetic and potential
energy. For a particle on a surface, the normal force does no work: it is always perpendicular
to any displacement the constraint permits. So it contributes nothing to either term.

The Euler–Lagrange equation,

$$
\frac{\mathrm{d}}{\mathrm{d}t}\left(\frac{\partial \mathcal{L}}{\partial \dot{q}_i}\right)
  - \frac{\partial \mathcal{L}}{\partial q_i} = 0,
$$

is written in generalised coordinates $q_i$ that already respect the constraint. A bead on a
wire has one coordinate, not three-minus-two. The constraint isn't solved; it's built into the
coordinates so there is nothing left to solve.[^dalembert]

[^dalembert]: This is d'Alembert's principle doing the work, and it is the genuinely non-obvious
    step. Everything after it is calculus.

> The method is not a trick for avoiding forces. It is a reformulation in which the forces you
> were avoiding were never variables in the first place.

## The trade you are making

You give up locality of reasoning. A Newtonian free-body diagram tells you what is pushing on
what, right here. A Lagrangian tells you nothing of the sort — it hands you correct equations
and stays silent about mechanism.

| Formulation | Primitive object | Good for |
| --- | --- | --- |
| Newtonian | force, a vector | intuition, contact problems |
| Lagrangian | $\mathcal{L}$, a scalar | constraints, coordinate freedom |
| Hamiltonian | $H$, a scalar on phase space | structure, conservation, quantisation |

The scalar formulations travel better. A vector equation must be re-derived in every coordinate
system; a scalar one does not care which coordinates you chose.

```python
def euler_lagrange(L, q, qdot, t):
    """d/dt (dL/dqdot) - dL/dq = 0, symbolically."""
    return sp.diff(sp.diff(L, qdot), t) - sp.diff(L, q)
```

## Where the feeling comes from

The sense of cheating comes from having asked the wrong question first. "What forces act here?"
is a question about the parts. "What does this system extremise?" is a question about the whole,
and for constrained systems the whole is genuinely simpler than the parts.

It stops feeling like cheating around the time you need to find a Lagrangian for something
unfamiliar, and discover that the crank only turns once you already know what the system is.
