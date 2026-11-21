import type { TopicAnswers } from '../foundations';
import { py } from './code';

// Phase 7 · Generative models and reinforcement learning. One good answer for
// each practice exercise. The RL answers use gymnasium (pip install gymnasium).

export const phase7Answers: Record<string, TopicAnswers> = {
    'f7-t1': {
        derive: {
            answer: `The ELBO. A latent-variable model says p(x) = ∫ p(x | z) p(z) dz, which we can't compute. Bring in the encoder's distribution q(z | x) by multiplying and dividing by it:\n\nlog p(x) = log ∫ q(z | x) · [p(x | z) p(z) / q(z | x)] dz = log E_q[ p(x | z) p(z) / q(z | x) ].\n\nJensen's inequality: log is concave, so log E[Y] ≥ E[log Y]. Therefore\n\nlog p(x) ≥ E_q[ log p(x | z) + log p(z) − log q(z | x) ]\n= E_q[ log p(x | z) ] − KL( q(z | x) ‖ p(z) ).\n\nThat lower bound is the ELBO. The first term rewards reconstructing x from z; the second keeps the encoder's distribution close to the prior. The gap between log p(x) and the ELBO is exactly KL(q(z | x) ‖ p(z | x)), so a better encoder makes the bound tighter.\n\nThe KL in closed form, for q = N(μ, σ²) and p = N(0, 1) in one dimension:\nKL = E_q[log q − log p] = E_q[ −½ log(2πσ²) − (z − μ)²/(2σ²) + ½ log(2π) + z²/2 ].\nUse E_q[(z − μ)²] = σ² and E_q[z²] = σ² + μ²:\nKL = −½ log σ² − ½ + ½(σ² + μ²) = ½ (σ² + μ² − 1 − log σ²).\nIt is 0 exactly when μ = 0 and σ = 1, and for a d-dimensional diagonal Gaussian you add it up over the dimensions.`,
        },
        build: {
            answer: `Encoder: 784 → 400 → two outputs of size 2, the mean μ and the log-variance log σ² (learning the log keeps σ positive). Sample z = μ + σ·ε with ε ~ N(0, 1), the reparameterisation trick, so gradients flow through the sampling. Decoder: 2 → 400 → 784 with a sigmoid. Loss: binary cross-entropy between input and reconstruction (summed over pixels) plus the closed-form KL.\n\nAfter 5 epochs, the 2-D latent space coloured by digit shows the classes as overlapping regions arranged around the origin: similar-looking digits (4 and 9, 3 and 5) sit next to each other, with smooth transitions in between. Decoding a grid of points from −2 to 2 in each direction gives a map of digits morphing into one another, recognisable but blurry, which is the classic VAE picture.`,
            code: py`
                import numpy as np
                import torch
                import torch.nn as nn
                import torch.nn.functional as F
                import matplotlib.pyplot as plt
                from torchvision import datasets

                mnist = datasets.MNIST("data", train=True, download=True)
                X, labels = mnist.data.reshape(-1, 784).float() / 255, mnist.targets

                class VAE(nn.Module):
                    def __init__(self, z=2):
                        super().__init__()
                        self.enc, self.mu, self.logvar = nn.Linear(784, 400), nn.Linear(400, z), nn.Linear(400, z)
                        self.dec = nn.Sequential(nn.Linear(z, 400), nn.ReLU(), nn.Linear(400, 784), nn.Sigmoid())
                    def forward(self, x):
                        h = F.relu(self.enc(x))
                        mu, logvar = self.mu(h), self.logvar(h)
                        z = mu + torch.exp(0.5 * logvar) * torch.randn_like(mu)          # reparameterisation
                        return self.dec(z), mu, logvar

                def losses(model, x):
                    recon, mu, logvar = model(x)
                    rec = F.binary_cross_entropy(recon, x, reduction="sum") / len(x)
                    kl = 0.5 * torch.sum(logvar.exp() + mu**2 - 1 - logvar) / len(x)
                    return rec, kl

                def train_vae(kl_weight=1.0, epochs=5, seed=0):
                    torch.manual_seed(seed)
                    model = VAE()
                    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
                    for _ in range(epochs):
                        for idx in torch.randperm(len(X)).split(128):
                            rec, kl = losses(model, X[idx])
                            opt.zero_grad(); (rec + kl_weight * kl).backward(); opt.step()
                    return model

                if __name__ == "__main__":
                    model = train_vae()
                    with torch.no_grad():
                        rec, kl = losses(model, X[:10_000])
                        mu = model(X[:10_000])[1]
                        print(f"reconstruction {rec:.1f}, KL {kl:.2f} (per image)")
                        grid = torch.tensor([[x, y] for y in np.linspace(2, -2, 15) for x in np.linspace(-2, 2, 15)], dtype=torch.float32)
                        images = model.dec(grid).reshape(15, 15, 28, 28).permute(0, 2, 1, 3).reshape(15 * 28, 15 * 28)
                    fig, axes = plt.subplots(1, 2, figsize=(12, 6))
                    axes[0].scatter(mu[:, 0], mu[:, 1], c=labels[:10_000], cmap="tab10", s=2); axes[0].set_title("latent space by digit")
                    axes[1].imshow(images, cmap="gray"); axes[1].axis("off"); axes[1].set_title("decoded grid")
                    plt.show()
            `,
        },
        break: {
            answer: `No KL term: the model becomes a plain autoencoder with noise. Reconstructions get a little sharper (the reconstruction loss is only slightly lower here, 150.0 against 150.6, because a 2-number code is the real bottleneck), but the encoder is free to put each digit wherever it likes, spread far from the origin with gaps in between, and it shrinks σ so the noise barely matters. Sampling z from N(0, 1) and decoding then lands in empty or meaningless regions, so random samples are mostly not digits: the model is good at copying, useless at generating. In the run below the latent codes spread out to a standard deviation of about 4, where the prior expects 1, and the KL rises from about 5.6 to 34.\n\nKL multiplied by 10: now staying close to N(0, 1) matters ten times more than reconstructing well. The encoder squeezes all digits towards the origin and keeps the noise large, so less information about each image gets through. Reconstructions become very blurry, an "average digit" look, and distinct digits merge; in the extreme, the latent space is ignored completely (posterior collapse). In the run below the reconstruction loss is clearly worse (about 168 against 151) and the KL is pushed down to about 2.\n\nThe ELBO's two terms are a trade-off between faithful reconstructions and a tidy, sample-able latent space; β-VAEs tune that weight on purpose.`,
            code: py`
                import torch
                # VAE, losses, train_vae and X come from the Build answer above: save it as vae.py
                from vae import X, losses, train_vae

                for kl_weight in [0.0, 1.0, 10.0]:
                    model = train_vae(kl_weight=kl_weight)
                    with torch.no_grad():
                        rec, kl = losses(model, X[:10_000])
                        mu = model(X[:10_000])[1]
                    print(f"KL weight {kl_weight:4}: reconstruction {rec:6.1f}, KL {kl:6.2f}, "
                          f"spread of latent codes (std) {mu.std(0).mean():.2f}")
            `,
        },
        explain: {
            answer: `You describe a face to a sketch artist using just a few numbers. The encoder writes the description (the latent code) and the decoder is the artist who draws from it. A plain autoencoder lets the descriptions be anything, so a random description gives nonsense. A VAE also forces the descriptions to be tidy: every face's code must look like it came from the same simple, rounded cloud of possible codes (the KL term), so any random code from that cloud still gives a sensible face. That is what makes it a generator.\n\nWhy the images are blurry: the description is fuzzy on purpose, because each image maps to a small cloud of codes, not one exact point. The decoder has to draw a picture that works for all codes in that cloud, and when it is unsure about a detail, say exactly where an edge is, the safest drawing under its loss is the average of the possibilities, which looks blurred. Sharp but wrong would cost more than blurry but close.`,
        },
    },
    'f7-t5': {
        derive: {
            answer: `Fix the generator, so the fakes have some distribution p_g. The discriminator wants to maximise\n\nE_data[log D(x)] + E_g[log(1 − D(x))] = ∫ [ p_data(x)·log D(x) + p_g(x)·log(1 − D(x)) ] dx.\n\nD can choose its output separately for every x, so maximise the bracket at each x on its own. Write a = p_data(x), b = p_g(x) and y = D(x): maximise a·log y + b·log(1 − y).\n\nDifferentiate and set to zero: a/y − b/(1 − y) = 0, so a(1 − y) = b·y, and y = a / (a + b).\n\nSo D*(x) = p_data(x) / (p_data(x) + p_g(x)). Where only real data lives it says 1; where only fakes live it says 0.\n\nWhen the generator is perfect, p_g = p_data, so D*(x) = 1/2 everywhere: the best possible judge can only guess. Put D* back into the objective and it becomes −log 4 plus twice the Jensen–Shannon divergence between the data and the fakes, which is why training the generator against a good discriminator pulls the two distributions together.`,
        },
        build: {
            answer: `Two small networks: G turns one random number into one output, and D turns one number into a score. Each round, D takes one step (real → 1, fake → 0) and G takes one step (make D say "real" for its fakes).\n\nThe run below shows the game. The fakes start near 0, overshoot to 6.25, come back, and then wobble around the data's mean of 4. The spread ends a little too small (0.38 against 0.5), which is typical: a GAN finds it easier to place samples where the data is densest. The discriminator's average output on fakes goes to 0.50: it can no longer tell them from real numbers.`,
            code: py`
                import torch
                import torch.nn as nn

                torch.manual_seed(0)
                real = lambda n: 4 + 0.5 * torch.randn(n, 1)            # real data: mean 4, spread 0.5
                G = nn.Sequential(nn.Linear(1, 16), nn.ReLU(), nn.Linear(16, 1))    # noise -> fake number
                D = nn.Sequential(nn.Linear(1, 16), nn.ReLU(), nn.Linear(16, 1))    # number -> score ("real" if > 0)
                opt_g = torch.optim.Adam(G.parameters(), lr=1e-3)
                opt_d = torch.optim.Adam(D.parameters(), lr=1e-3)
                bce = nn.BCEWithLogitsLoss()
                ones, zeros = torch.ones(64, 1), torch.zeros(64, 1)

                for step in range(3001):
                    # 1. train the discriminator: real -> 1, fake -> 0
                    fake = G(torch.randn(64, 1)).detach()               # detach: this step must not change G
                    loss_d = bce(D(real(64)), ones) + bce(D(fake), zeros)
                    opt_d.zero_grad(); loss_d.backward(); opt_d.step()

                    # 2. train the generator: make D say "real" for fakes
                    loss_g = bce(D(G(torch.randn(64, 1))), ones)
                    opt_g.zero_grad(); loss_g.backward(); opt_g.step()

                    if step % 500 == 0:
                        with torch.no_grad():
                            x = G(torch.randn(5000, 1))
                            p = torch.sigmoid(D(x)).mean().item()
                        print(f"step {step:4d}  fake mean {x.mean():5.2f}  spread {x.std():4.2f}  D(fake) {p:.2f}")
                # step    0  fake mean  0.03  spread 0.28  D(fake) 0.53
                # step  500  fake mean  6.25  spread 0.79  D(fake) 0.38
                # step 1000  fake mean  4.27  spread 0.45  D(fake) 0.49
                # step 1500  fake mean  4.31  spread 0.43  D(fake) 0.48
                # step 2000  fake mean  3.86  spread 0.37  D(fake) 0.51
                # step 2500  fake mean  4.19  spread 0.41  D(fake) 0.49
                # step 3000  fake mean  4.04  spread 0.38  D(fake) 0.50
            `,
        },
        break: {
            answer: `Two bumps, one D step per G step: the GAN covers both. Over five seeds, between 46% and 58% of the fakes land on the left bump, close to the right answer of 50%. But only 77% to 89% of the fakes are near a bump at all: the rest fall in the empty gap between them. The generator is a smooth function of its noise, so to reach both bumps it has to pass through the space in between. Real GANs show the same thing as odd in-between images.\n\n20 D steps per G step: the discriminator stays ahead (its average output on fakes drops to about 0.35), and the generator gives up one bump. In two of three runs 100% of the fakes land on the left bump and none on the right; in the third, 81%. That is mode collapse: the fakes that remain look fine one by one, but half of the data's variety is gone.\n\nSo balance matters. Too weak a discriminator teaches nothing; one that runs far ahead can push the generator into a corner. Much of the practical work on GANs (other losses, limits on the discriminator, tricks that let it compare whole batches) is about keeping the two in step.`,
            code: py`
                import torch
                import torch.nn as nn

                def run(d_steps, seed, rounds):
                    torch.manual_seed(seed)
                    def real(n):                                         # two bumps: half near -2, half near +2
                        side = torch.randint(0, 2, (n, 1)) * 4.0 - 2.0
                        return side + 0.3 * torch.randn(n, 1)
                    G = nn.Sequential(nn.Linear(1, 16), nn.ReLU(), nn.Linear(16, 1))
                    D = nn.Sequential(nn.Linear(1, 16), nn.ReLU(), nn.Linear(16, 1))
                    opt_g = torch.optim.Adam(G.parameters(), lr=1e-3)
                    opt_d = torch.optim.Adam(D.parameters(), lr=1e-3)
                    bce = nn.BCEWithLogitsLoss()
                    ones, zeros = torch.ones(64, 1), torch.zeros(64, 1)
                    for step in range(rounds):
                        for _ in range(d_steps):
                            fake = G(torch.randn(64, 1)).detach()
                            loss_d = bce(D(real(64)), ones) + bce(D(fake), zeros)
                            opt_d.zero_grad(); loss_d.backward(); opt_d.step()
                        loss_g = bce(D(G(torch.randn(64, 1))), ones)
                        opt_g.zero_grad(); loss_g.backward(); opt_g.step()
                    with torch.no_grad():
                        x = G(torch.randn(5000, 1))
                        left = (x < 0).float().mean().item()
                        near = ((x + 2).abs() < 0.9).float().mean().item() + ((x - 2).abs() < 0.9).float().mean().item()
                        return left, near, torch.sigmoid(D(x)).mean().item()

                for seed in range(5):
                    print("1 D step  ", [round(v, 2) for v in run(1, seed, 3000)])
                for seed in range(3):
                    print("20 D steps", [round(v, 2) for v in run(20, seed, 1000)])
                # (share on the left bump, share near a bump, D's average output on fakes)
                # 1 D step   [0.53, 0.84, 0.49]
                # 1 D step   [0.52, 0.84, 0.49]
                # 1 D step   [0.58, 0.77, 0.48]
                # 1 D step   [0.5, 0.89, 0.49]
                # 1 D step   [0.46, 0.87, 0.48]
                # 20 D steps [0.81, 0.8, 0.36]
                # 20 D steps [1.0, 1.0, 0.35]
                # 20 D steps [1.0, 0.98, 0.33]
            `,
        },
        explain: {
            answer: `A forger prints banknotes and a bank clerk checks them. At first the forger's notes are terrible and the clerk rejects them at a glance. But each rejection tells the forger something: which detail gave the note away. So the next batch is a little better. The clerk, seeing better fakes, has to look more closely, and learns finer details too.\n\nIn a GAN the forger is the generator: it turns random noise into samples. The clerk is the discriminator: it gives each sample a probability of being real. The discriminator learns from labelled examples (real ones and fakes). The generator never sees real data at all: it learns only from the discriminator's verdict, by following the gradient that makes "real" more likely.\n\nBalance is the point where the forger's notes are distributed exactly like real ones. The clerk can then do no better than toss a coin, and says 0.5 for everything. Nobody can improve by changing only their own behaviour, so the game stops there.`,
        },
    },
    'f7-t2': {
        derive: {
            answer: `One step of the forward process adds a little noise: x_t = √(1 − β_t) · x_{t−1} + √β_t · ε_t, with ε_t ~ N(0, I) fresh each step. Write α_t = 1 − β_t and ᾱ_t = α₁ · α₂ · … · α_t.\n\nClaim: x_t = √ᾱ_t · x₀ + √(1 − ᾱ_t) · ε, with a single ε ~ N(0, I).\n\nProof by induction. For t = 1 it is the definition. Suppose it holds for t − 1: x_{t−1} = √ᾱ_{t−1} · x₀ + √(1 − ᾱ_{t−1}) · ε′. Then\nx_t = √α_t · x_{t−1} + √(1 − α_t) · ε_t\n= √(α_t ᾱ_{t−1}) · x₀ + √α_t · √(1 − ᾱ_{t−1}) · ε′ + √(1 − α_t) · ε_t.\n\nThe first term is √ᾱ_t · x₀, since α_t ᾱ_{t−1} = ᾱ_t. The two noise terms are independent Gaussians with mean 0, so their sum is a Gaussian whose variance is the sum of their variances:\nα_t (1 − ᾱ_{t−1}) + (1 − α_t) = α_t − α_t ᾱ_{t−1} + 1 − α_t = 1 − ᾱ_t.\nSo they can be replaced by one Gaussian √(1 − ᾱ_t) · ε. Done.\n\nWhy it matters: in training you can jump straight to any step t in one line, without simulating the t steps before it, so every training example picks a random t.`,
        },
        build: {
            answer: `Data: 2-D points on a spiral. Forward process: 1,000 steps with β rising linearly from 0.0001 to 0.02. The model is a small MLP that takes a noisy point x_t and the step t (as a sinusoidal embedding) and predicts the noise ε that was added. Training: pick a random point, a random t and fresh noise, build x_t in one jump with the closed form, and minimise the squared error between the true and predicted noise.\n\nGeneration (DDPM sampling): start from pure noise and run the 1,000 steps backwards, each removing the predicted noise a little and adding back a small amount of fresh noise. Snapshots at t = 1,000, 750, 500, 250 and 0 show a shapeless cloud slowly gathering into the spiral; most of the shape appears in the last few hundred steps. The final samples sit on the spiral: in the run below their average distance to the nearest real point is about 0.025, against 0.32 for pure noise and 0.009 for fresh real spiral points. (A smaller network trained for fewer steps got only to about 0.22: diffusion models need enough capacity and training to learn the noise at every level.) Training takes about 10 seconds on a laptop.`,
            code: py`
                import math
                import torch
                import torch.nn as nn
                import matplotlib.pyplot as plt

                def spiral(n):
                    t = torch.rand(n) * 3 * math.pi + math.pi / 2
                    return torch.stack([t * torch.cos(t), t * torch.sin(t)], 1) / 5 + 0.03 * torch.randn(n, 2)

                class Denoiser(nn.Module):
                    def __init__(self):
                        super().__init__()
                        self.net = nn.Sequential(nn.Linear(2 + 32, 256), nn.SiLU(), nn.Linear(256, 256), nn.SiLU(),
                                                 nn.Linear(256, 256), nn.SiLU(), nn.Linear(256, 2))
                    def forward(self, x, t, T):
                        freqs = torch.exp(torch.arange(16) * -math.log(1000) / 16)
                        angle = (t.float() / T)[:, None] * 1000 * freqs
                        return self.net(torch.cat([x, torch.sin(angle), torch.cos(angle)], 1))

                def train_ddpm(betas, steps=10_000, seed=0):
                    torch.manual_seed(seed)
                    T, alpha_bar = len(betas), torch.cumprod(1 - betas, 0)
                    model, data = Denoiser(), spiral(20_000)
                    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
                    for _ in range(steps):
                        x0 = data[torch.randint(len(data), (256,))]
                        t = torch.randint(0, T, (256,))
                        eps = torch.randn_like(x0)
                        xt = alpha_bar[t].sqrt()[:, None] * x0 + (1 - alpha_bar[t]).sqrt()[:, None] * eps    # one jump
                        loss = ((model(xt, t, T) - eps) ** 2).mean()
                        opt.zero_grad(); loss.backward(); opt.step()
                    return model

                @torch.no_grad()
                def sample(model, betas, n=2000, timesteps=None, snapshots=()):
                    T, alphas = len(betas), 1 - betas
                    alpha_bar = torch.cumprod(alphas, 0)
                    x, saved = torch.randn(n, 2), {}
                    for t in (timesteps if timesteps is not None else range(T - 1, -1, -1)):
                        eps = model(x, torch.full((n,), t), T)
                        x = (x - betas[t] / (1 - alpha_bar[t]).sqrt() * eps) / alphas[t].sqrt()
                        if t > 0:
                            x = x + betas[t].sqrt() * torch.randn_like(x)
                        if t in snapshots:
                            saved[t] = x.clone()
                    return x, saved

                def distance_to_data(points, ref=spiral(5000)):
                    return torch.cdist(points, ref).min(1).values.mean().item()

                if __name__ == "__main__":
                    betas = torch.linspace(1e-4, 0.02, 1000)
                    model = train_ddpm(betas)
                    x, saved = sample(model, betas, snapshots=(999, 750, 500, 250, 0))
                    print(f"average distance to the spiral: samples {distance_to_data(x):.3f}, pure noise {distance_to_data(torch.randn(2000, 2)):.3f}, "
                          f"real spiral points {distance_to_data(spiral(2000)):.3f}")
                    fig, axes = plt.subplots(1, 5, figsize=(20, 4))
                    for ax, t in zip(axes, (999, 750, 500, 250, 0)):
                        ax.scatter(saved[t][:, 0], saved[t][:, 1], s=1); ax.set_title(f"t = {t}"); ax.set_xlim(-3, 3); ax.set_ylim(-3, 3)
                    plt.show()
            `,
        },
        break: {
            answer: `Only 10 steps with the same DDPM sampler (using every 100th step): the samples come out as a shapeless cloud, about as far from the spiral as pure noise (0.32, against 0.025 with all 1,000 steps). The DDPM update is derived for one small step: it assumes that between step t and t − 1 only a tiny amount of noise changes. Jumping 100 steps at a time with that same formula removes far too little noise at each jump and adds the wrong amount back, so the process never reaches clean data. Fast samplers such as DDIM and DPM-Solver use update rules designed for big jumps, which is how modern models get good images in 20 to 50 steps.\n\nA noise schedule that rises too fast (β up to 0.2 instead of 0.02): the signal is almost gone by about step 300 (√ᾱ ≈ 0.01, against 0.63 with the normal schedule), so the last 700 of the 1,000 steps are pure noise with no trace of the data. The model spends most of its training on steps where there is nothing to learn, and gets few examples of the in-between levels where the shape forms. The samples are clearly worse: in the run below, about 0.08 from the spiral against 0.025. Schedule design (like the cosine schedule) is about spreading the destruction evenly over the steps.`,
            code: py`
                import torch
                # train_ddpm, sample and distance_to_data come from the Build answer above: save it as ddpm.py
                from ddpm import train_ddpm, sample, distance_to_data

                betas = torch.linspace(1e-4, 0.02, 1000)
                model = train_ddpm(betas)
                full, _ = sample(model, betas)
                ten, _ = sample(model, betas, timesteps=range(999, -1, -100))       # 10 steps, same sampler
                print(f"1,000 steps: {distance_to_data(full):.3f}, 10 steps: {distance_to_data(ten):.3f}")

                fast = torch.linspace(1e-4, 0.2, 1000)                                  # noise rises 10 times faster
                alpha_bar = torch.cumprod(1 - fast, 0)
                print(f"signal left after 300 steps: fast schedule {alpha_bar[299].sqrt():.3f}, normal {torch.cumprod(1 - betas, 0)[299].sqrt():.3f}")
                print(f"fast schedule samples: {distance_to_data(sample(train_ddpm(fast), fast)[0]):.3f}")
            `,
        },
        explain: {
            answer: `A sculptor starts with a rough block of stone and removes a little at each step until a statue appears. A diffusion model starts from pure noise and removes a little noise at each step until an image appears. To learn this, it practises the reverse: take real images, add more and more noise until nothing is left, and train a network to guess, at any noise level, what noise was added, so it can take it away.\n\nGeneration is slow because the sculpting really is step by step: each step needs a full pass through a large network, and the classic method uses hundreds to a thousand steps, where a GPT-style model makes one pass per token and a GAN one pass per image. Faster samplers and distilled models cut this to a handful of steps.`,
        },
    },
    'f7-t3': {
        derive: {
            answer: `The value of a state is the expected discounted sum of rewards from there: V(s) = r + γ · V(next state).\n\nGoal is the end, so V(Goal) = 0 (no more rewards).\n\nB: one step to Goal, and reaching Goal gives reward 1.\nV(B) = 1 + 0.9 × V(Goal) = 1 + 0 = 1.\n\nA: one step to B with reward 0.\nV(A) = 0 + 0.9 × V(B) = 0.9 × 1 = 0.9.\n\nEach extra step away from the reward multiplies its value by γ = 0.9: a state three steps away would be worth 0.81. That is how a discount makes the agent prefer shorter paths to the same reward.`,
        },
        build: {
            answer: `FrozenLake (4 × 4, not slippery): start in the top-left, reach the goal in the bottom-right, fall into a hole and the episode ends with nothing. The only reward is 1 at the goal.\n\nTabular Q-learning keeps a 16 × 4 table, one value per (state, action). Each step: choose an action ε-greedily (random with probability ε, which decays from 1 to 0.05, otherwise the best known), take it, and update Q(s, a) ← Q(s, a) + α · (r + γ · max Q(s′, ·) − Q(s, a)).\n\nThe reward per episode starts near 0 (random wandering rarely reaches the goal), climbs once the goal is found and its value spreads back through the table, and settles near 1, apart from the occasional exploratory step into a hole. The printed arrows show a shortest safe path from the start to the goal.`,
            code: py`
                import numpy as np
                import gymnasium as gym
                import matplotlib.pyplot as plt

                def q_learning(episodes=2000, gamma=0.95, alpha=0.8, eps_start=1.0, eps_end=0.05, seed=0):
                    env = gym.make("FrozenLake-v1", is_slippery=False)
                    rng = np.random.default_rng(seed)
                    Q, rewards = np.zeros((16, 4)), []
                    for ep in range(episodes):
                        state, _ = env.reset(seed=seed + ep)
                        eps = max(eps_end, eps_start * (1 - ep / (0.6 * episodes)))
                        done, total = False, 0.0
                        while not done:
                            explore = rng.random() < eps
                            action = rng.integers(4) if explore else int(np.argmax(Q[state]))
                            nxt, r, terminated, truncated, _ = env.step(action)
                            target = r + (0 if terminated else gamma * Q[nxt].max())
                            Q[state, action] += alpha * (target - Q[state, action])
                            state, total, done = nxt, total + r, terminated or truncated
                        rewards.append(total)
                    return Q, rewards

                if __name__ == "__main__":
                    Q, rewards = q_learning()
                    smooth = np.convolve(rewards, np.ones(50) / 50, mode="valid")
                    print(f"success rate, first 200 episodes {np.mean(rewards[:200]):.0%}, last 200 {np.mean(rewards[-200:]):.0%}")
                    lake = gym.make("FrozenLake-v1", is_slippery=False).unwrapped.desc.astype(str)
                    arrows = np.array(["←", "↓", "→", "↑"])[Q.argmax(1)].reshape(4, 4)
                    for row in range(4):
                        print(" ".join(lake[row, c] if lake[row, c] in "HG" else arrows[row, c] for c in range(4)))
                    plt.plot(smooth); plt.xlabel("episode"); plt.ylabel("reward (moving average of 50)"); plt.show()
            `,
        },
        break: {
            answer: `No exploration from the start (ε = 0): with every Q value at 0, the "best" action is a tie, np.argmax always picks the first one (left), and moving left from the start corner just bumps into the edge. The agent repeats the same useless action until the episode times out, never reaches the goal, never sees a reward, so nothing in the table ever changes. Success rate: 0%, forever. Without exploration, an agent can only learn about things it already does; it needs to try new actions to discover where the rewards are. (Optimistic initial values, starting Q high, are another way to force exploration.)\n\nγ = 0: the agent only cares about the reward of the very next step. Only the one state next to the goal learns that "right" or "down" is good, because only there does an action earn an immediate reward; every other state's values stay 0, since the future doesn't count at all. From the start, the agent has no reason to head anywhere, so its greedy policy fails. The discount is what lets a reward that is many steps away flow back to the states that lead to it.`,
            code: py`
                import numpy as np
                # q_learning comes from the Build answer above: save it as qlearn.py
                from qlearn import q_learning

                _, rewards = q_learning(eps_start=0.0, eps_end=0.0)
                print(f"no exploration: success rate {np.mean(rewards):.0%}")

                Q, rewards = q_learning(gamma=0.0)
                print("gamma = 0: states with any non-zero value:", np.nonzero(Q.max(1))[0].tolist())
                print("max Q per state:\n", Q.max(1).reshape(4, 4).round(2))
            `,
        },
        explain: {
            answer: `Training a dog with treats. Nobody shows the dog the right move; it tries things, and some lead to treats. The hard part is credit assignment: the dog sits, rolls over, barks, and then gets a treat. Which of those earned it? If the treat comes several actions later, the dog has to work out which earlier choices led there.\n\nReinforcement learning has the same problem, often much worse: in chess, the reward (win or lose) comes after dozens of moves, and the agent must figure out which moves deserved the credit. Value functions solve it by passing value backwards: a state is worth the reward it leads to, discounted by how far away it is, so good early moves gradually learn that they were good.`,
        },
    },
    'f7-t6': {
        derive: {
            answer: `First move: reward 0, then the best the next square offers.\ny = r + γ·max Q_target(s′, ·) = 0 + 0.9 × 0.7 = 0.63.\nLoss = (Q(s, a) − y)² = (0.4 − 0.63)² = 0.0529.\nThe network's value is below the target, so the update pushes Q(s, a) up, towards 0.63.\n\nSecond move: it reaches the goal, so the episode is over and there is no next square to add.\ny = r = 1.\nLoss = (0.4 − 1)² = 0.36.\nAgain Q(s, a) is pushed up, towards 1.\n\nNotice what the first target is made of: another estimate. The network learns from its own guesses about the next square, and only the moves into the goal bring in a real number from the environment. That is how value spreads backwards from the goal, one square per round of learning, and it is why a wrong estimate can be copied from square to square.`,
        },
        build: {
            answer: `The environment is a function step(s, a) that returns the next square, the reward and whether the episode has ended. The agent acts with ε-greedy, stores every move in the replay buffer, and after each move trains on 32 random moves from it. The targets come from the frozen copy, which is refreshed every 100 steps.\n\nAfter 300 episodes the greedy path from the start is [0, 4, 5, 6, 10, 11, 15]: 6 moves, the fewest possible on a 4 × 4 grid. The network values the start at 0.59, and the exact answer is 0.9⁵ = 0.59049, because the single reward arrives on the sixth move and is discounted five times.\n\nA table would solve this small grid just as well. The point of the network is that nothing in this code depends on the number of states: swap the 16 numbers for the pixels of a game screen and a bigger network, and it is the method that learned Atari games.`,
            code: py`
                import random
                import torch
                import torch.nn as nn

                N, GOAL = 4, 15                                         # a 4 x 4 grid, goal in the bottom-right corner
                MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]              # up, down, left, right

                def step(s, a):                                         # the environment: (next state, reward, done)
                    r, c = divmod(s, N)
                    r = min(N - 1, max(0, r + MOVES[a][0]))             # a move into a wall leaves you where you are
                    c = min(N - 1, max(0, c + MOVES[a][1]))
                    s2 = r * N + c
                    return s2, float(s2 == GOAL), s2 == GOAL

                one_hot = lambda s: torch.eye(N * N)[s]                 # a state as 16 numbers

                def train(gamma=0.9, explore=True, seed=0):
                    random.seed(seed); torch.manual_seed(seed)
                    q = nn.Sequential(nn.Linear(N * N, 32), nn.ReLU(), nn.Linear(32, 4))       # Q(s, ·): one value per move
                    target = nn.Sequential(nn.Linear(N * N, 32), nn.ReLU(), nn.Linear(32, 4))  # the frozen copy
                    target.load_state_dict(q.state_dict())
                    opt = torch.optim.Adam(q.parameters(), lr=1e-3)
                    buffer, steps, wins = [], 0, 0
                    for episode in range(300):
                        s = 0
                        eps = max(0.05, 1 - episode / 200) if explore else 0.0                 # explore less over time
                        for _ in range(50):
                            a = random.randrange(4) if random.random() < eps else q(one_hot(s)).argmax().item()
                            s2, r, done = step(s, a)
                            buffer.append((s, a, r, s2, done)); buffer[:] = buffer[-5000:]     # the replay buffer
                            s, steps = s2, steps + 1

                            batch = random.sample(buffer, min(32, len(buffer)))                # learn from random old moves
                            S, A, R, S2, Dn = zip(*batch)
                            S, S2 = torch.stack([one_hot(x) for x in S]), torch.stack([one_hot(x) for x in S2])
                            A, R, Dn = torch.tensor(A), torch.tensor(R), torch.tensor(Dn, dtype=torch.float32)
                            with torch.no_grad():                                              # the target is not trained
                                y = R + gamma * target(S2).max(dim=1).values * (1 - Dn)       # just r when the episode ended
                            loss = nn.functional.mse_loss(q(S).gather(1, A[:, None]).squeeze(1), y)
                            opt.zero_grad(); loss.backward(); opt.step()
                            if steps % 100 == 0:
                                target.load_state_dict(q.state_dict())                         # refresh the frozen copy
                            if done:
                                wins += 1
                                break

                    s, path = 0, [0]                                    # follow the learned values from the start
                    for _ in range(20):
                        s, _, done = step(s, q(one_hot(s)).argmax().item()); path.append(s)
                        if done: break
                    return path, q(one_hot(0)).max().item(), wins

                path, q_start, wins = train()
                print("greedy path:", path, "in", len(path) - 1, "moves")
                print("Q(start, best move):", round(q_start, 2), "| exact value 0.9 ** 5 =", round(0.9 ** 5, 2))
                # greedy path: [0, 4, 5, 6, 10, 11, 15] in 6 moves
                # Q(start, best move): 0.59 | exact value 0.9 ** 5 = 0.59
            `,
        },
        break: {
            answer: `γ = 1: in all five runs the greedy path fails to reach the goal within 20 moves, and Q(start) comes out between 1.22 and 1.51, although no return can be more than 1.\n\nTwo things go wrong together. With no discount, every square that can reach the goal is truly worth exactly 1, so the values no longer say "nearer is better": the agent has no reason to prefer a short route, or to stop wandering. And the max in the target picks the largest of four noisy estimates, which is too high on average. With γ below 1 each round of learning shrinks such errors; with γ = 1 nothing shrinks them, and they are copied from square to square. (The "Go deeper" of the previous lesson shows this shrinking factor is exactly γ.)\n\nε = 0, back with γ = 0.9: in two of five runs the agent never reaches the goal once in 300 episodes, and Q(start) stays at 0.00. It has never seen a reward, so there is nothing to learn from. The other three runs are lucky: their random starting weights happen to walk the agent to the goal, and two of them then learn the right value, 0.59.\n\nSo exploration is what turns "lucky or not" into "always". The agent can only learn the value of moves it has actually tried.`,
            code: py`
                # The same train() as in Build, called with different settings.
                for seed in range(5):
                    path, q_start, wins = train(gamma=1.0, seed=seed)
                    print(f"gamma 1,   seed {seed}: reached the goal: {path[-1] == GOAL}, Q(start) = {q_start:.2f}")
                for seed in range(5):
                    path, q_start, wins = train(explore=False, seed=seed)
                    print(f"epsilon 0, seed {seed}: goal reached in {wins} of 300 training episodes, Q(start) = {q_start:.2f}")
                # gamma 1,   seed 0: reached the goal: False, Q(start) = 1.39
                # gamma 1,   seed 1: reached the goal: False, Q(start) = 1.42
                # gamma 1,   seed 2: reached the goal: False, Q(start) = 1.45
                # gamma 1,   seed 3: reached the goal: False, Q(start) = 1.51
                # gamma 1,   seed 4: reached the goal: False, Q(start) = 1.22
                # epsilon 0, seed 0: goal reached in 50 of 300 training episodes, Q(start) = 0.06
                # epsilon 0, seed 1: goal reached in 0 of 300 training episodes, Q(start) = 0.00
                # epsilon 0, seed 2: goal reached in 245 of 300 training episodes, Q(start) = 0.59
                # epsilon 0, seed 3: goal reached in 0 of 300 training episodes, Q(start) = 0.00
                # epsilon 0, seed 4: goal reached in 279 of 300 training episodes, Q(start) = 0.59
            `,
        },
        explain: {
            answer: `A chess player keeps a diary of every position she has played and the move she made. That diary is the replay buffer. In the evening she doesn't only think about today's game: she opens the diary at random pages and studies old positions again. Random pages matter. If she only studied the last game, ten positions in a row would be nearly the same, and she would over-learn that one situation and forget the others.\n\nTo grade a move she needs a view of how good the resulting position was. She uses last week's notes for that, and doesn't rewrite them while she studies. Those notes are the target network: a frozen copy of what she knew a little while ago. If she graded against notes she was changing at the same moment, the standard would shift under her with every move she looked at, and her opinions could spiral instead of settling.\n\nEvery so often she replaces the old notes with her current understanding, and starts again. That is the copy every 100 steps.`,
        },
    },
    'f7-t4': {
        derive: {
            answer: `We want the gradient of the expected reward J(θ) = E_{a ~ π_θ}[R(a)] with respect to the policy's parameters θ. For a discrete policy (one step, for clarity):\n\nJ(θ) = Σ_a π_θ(a) · R(a)\n∇J(θ) = Σ_a ∇π_θ(a) · R(a)      (R doesn't depend on θ)\n\nThe trick: ∇ log π = ∇π / π, so ∇π = π · ∇ log π. Substitute:\n\n∇J(θ) = Σ_a π_θ(a) · ∇ log π_θ(a) · R(a) = E_{a ~ π_θ}[ R(a) · ∇ log π_θ(a) ].\n\nWhy it matters: the right-hand side is an expectation under the policy itself, so we can estimate it just by sampling actions, running them, and averaging R · ∇ log π. We never need to differentiate the reward or the environment. For whole episodes the same argument gives ∇J = E[ Σ_t ∇ log π(a_t | s_t) · G_t ], with G_t the return from step t.\n\nSubtracting a baseline b(s) keeps it unbiased, because E[∇ log π] = Σ_a ∇π(a) = ∇ Σ_a π(a) = ∇1 = 0, but it can reduce the variance a lot.`,
        },
        build: {
            answer: `CartPole: keep a pole balanced on a cart; +1 reward per step, up to 500.\n\nREINFORCE with a baseline: run a whole episode with the policy network, compute each step's return G_t, subtract a learned value estimate V(s_t) (the baseline), and step along Σ ∇ log π(a_t | s_t) · (G_t − V(s_t)), while training V to predict G_t.\n\nPPO: collect a batch of steps, estimate advantages with GAE, then do several epochs of minibatch updates on the clipped objective min(ratio · A, clip(ratio, 0.8, 1.2) · A), where ratio = π_new(a | s) / π_old(a | s), plus a value loss.\n\nIn the run below, PPO learns much better: over its last 20 episodes it averages about 480 of a possible 500, against about 220 for REINFORCE with a baseline after 500 episodes (both reach 500 at their best). REINFORCE updates once per episode from a single, noisy sample of what the policy does; PPO collects a batch of steps, uses a lower-variance advantage estimate (GAE), and reuses each batch for several careful updates. That efficiency and stability is why PPO became the standard, including for RLHF.`,
            code: py`
                import numpy as np
                import torch
                import torch.nn as nn
                import gymnasium as gym

                def mlp(out):
                    return nn.Sequential(nn.Linear(4, 64), nn.Tanh(), nn.Linear(64, 64), nn.Tanh(), nn.Linear(64, out))

                def reinforce(episodes=500, baseline=True, seed=0):
                    torch.manual_seed(seed); env = gym.make("CartPole-v1")
                    policy, value = mlp(2), mlp(1)
                    opt = torch.optim.Adam([*policy.parameters(), *value.parameters()], lr=3e-3)
                    returns_per_episode = []
                    for ep in range(episodes):
                        obs, _ = env.reset(seed=seed + ep)
                        log_probs, states, rewards, done = [], [], [], False
                        while not done:
                            s = torch.tensor(obs, dtype=torch.float32)
                            dist = torch.distributions.Categorical(logits=policy(s))
                            a = dist.sample()
                            obs, r, term, trunc, _ = env.step(a.item())
                            log_probs.append(dist.log_prob(a)); states.append(s); rewards.append(r); done = term or trunc
                        G, returns = 0.0, []
                        for r in reversed(rewards):
                            G = r + 0.99 * G; returns.insert(0, G)
                        returns = torch.tensor(returns)
                        v = value(torch.stack(states)).squeeze(1)
                        advantage = returns - v.detach() if baseline else returns
                        loss = -(torch.stack(log_probs) * advantage).mean() + ((v - returns) ** 2).mean() * baseline
                        opt.zero_grad(); loss.backward(); opt.step()
                        returns_per_episode.append(sum(rewards))
                    return returns_per_episode

                def ppo(iterations=40, steps=2048, epochs=10, clip=0.2, lr=3e-4, seed=0):
                    torch.manual_seed(seed); env = gym.make("CartPole-v1")
                    policy, value = mlp(2), mlp(1)
                    opt = torch.optim.Adam([*policy.parameters(), *value.parameters()], lr=lr)
                    obs, _ = env.reset(seed=seed); episode_return, finished = 0.0, []
                    for it in range(iterations):
                        S, A, LP, R, D, V = [], [], [], [], [], []
                        for _ in range(steps):
                            s = torch.tensor(obs, dtype=torch.float32)
                            with torch.no_grad():
                                dist = torch.distributions.Categorical(logits=policy(s)); a = dist.sample()
                                S.append(s); A.append(a); LP.append(dist.log_prob(a)); V.append(value(s).squeeze())
                            obs, r, term, trunc, _ = env.step(a.item())
                            R.append(r); D.append(term); episode_return += r
                            if term or trunc:
                                finished.append(episode_return); episode_return = 0.0; obs, _ = env.reset()
                        with torch.no_grad():
                            next_v = value(torch.tensor(obs, dtype=torch.float32)).squeeze()
                        adv, gae = torch.zeros(steps), 0.0
                        for t in reversed(range(steps)):                              # GAE
                            nv = next_v if t == steps - 1 else V[t + 1]
                            delta = R[t] + 0.99 * nv * (1 - D[t]) - V[t]
                            gae = delta + 0.99 * 0.95 * (1 - D[t]) * gae
                            adv[t] = gae
                        S, A, LP, V = torch.stack(S), torch.stack(A), torch.stack(LP), torch.stack(V)
                        returns = adv + V
                        adv = (adv - adv.mean()) / (adv.std() + 1e-8)
                        for _ in range(epochs):
                            for idx in torch.randperm(steps).split(256):
                                dist = torch.distributions.Categorical(logits=policy(S[idx]))
                                ratio = torch.exp(dist.log_prob(A[idx]) - LP[idx])
                                if clip is None:
                                    policy_loss = -(ratio * adv[idx]).mean()                 # no clipping
                                else:
                                    policy_loss = -torch.min(ratio * adv[idx], ratio.clamp(1 - clip, 1 + clip) * adv[idx]).mean()
                                value_loss = ((value(S[idx]).squeeze(1) - returns[idx]) ** 2).mean()
                                opt.zero_grad(); (policy_loss + 0.5 * value_loss).backward(); opt.step()
                    return finished

                if __name__ == "__main__":
                    r = reinforce()
                    p = ppo()
                    for name, rets in [("REINFORCE + baseline", r), ("PPO", p)]:
                        last = rets[-20:]
                        print(f"{name}: {len(rets)} episodes, mean return of the last 20 {np.mean(last):.0f} (std {np.std(last):.0f}), "
                              f"best {max(rets):.0f}")
            `,
        },
        break: {
            answer: `Without the baseline, REINFORCE pushes up the probability of every action in proportion to the whole return that followed, and on CartPole every return is positive. So every action gets reinforced, the good ones only slightly more than the bad ones, and the signal is buried in noise. The learning curve becomes far noisier: in the run below, the return over the last 50 episodes swings with a standard deviation of about 160 without the baseline, against about 24 with it. (Its average happened to be higher in this one run, 246 against 195, which is what high variance looks like: run a few seeds and the no-baseline results scatter widely.) With a baseline, actions are judged against what was expected (the advantage), so below-average actions are pushed down and above-average ones up.\n\nPPO without clipping, with large updates (a bigger learning rate and many epochs on each batch): the new policy can move far from the policy that collected the data. The advantages were measured for the old policy, so once the ratio π_new / π_old is far from 1 they no longer describe what the new policy does, and a few huge steps can wreck a policy that was working: the return collapses and may not recover. Clipping the ratio to [0.8, 1.2] removes the incentive to move further than that in one update, a cheap, safe trust region. In the run below, with the same aggressive settings (10 times the learning rate, 30 epochs per batch), the clipped version still reaches and holds the maximum return of 500, while the unclipped one ends lower, averaging about 400.`,
            code: py`
                import numpy as np
                # reinforce and ppo come from the Build answer above: save it as rl.py
                from rl import reinforce, ppo

                for baseline in [True, False]:
                    rets = reinforce(baseline=baseline)
                    print(f"REINFORCE, baseline={baseline}: mean return of the last 50 {np.mean(rets[-50:]):.0f}, "
                          f"episode-to-episode noise (std of the last 50) {np.std(rets[-50:]):.0f}")

                for clip in [0.2, None]:
                    rets = ppo(iterations=25, epochs=30, lr=3e-3, clip=clip)              # deliberately large updates
                    print(f"PPO, clip={clip}: mean return of the last 20 episodes {np.mean(rets[-20:]):.0f}, best {max(rets):.0f}")
            `,
        },
        explain: {
            answer: `A basketball player practising free throws. After a shot that goes in, they do a bit more of whatever they just did; after a miss, a bit less. That is a policy gradient: increase the probability of actions that led to good results, decrease it for bad ones, in proportion to how much better or worse than expected the result was (the baseline is "what I usually score").\n\nPPO is a coach who says: small changes only. If one great shot made the player completely rebuild their technique, the next day could be a disaster: one shot is noisy evidence. So the coach limits how far the technique may change from one practice session to the next. That is the clipping: each update can move the policy only a little away from the one that collected the experience, which makes learning steady instead of erratic.`,
        },
    },
};
