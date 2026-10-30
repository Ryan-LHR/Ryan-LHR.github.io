---
permalink: /
title: "Haoran Li"
excerpt: "PhD Candidate, AI & Software Engineering"
author_profile: true
redirect_from: 
  - /about/
  - /about.html
---

<span class='anchor' id='about-me'></span>

I am a Ph.D. candidate in Systems Engineering at Beihang University, advised by Prof. Shihai Wang. My research lies at the intersection of software engineering and trustworthy artificial intelligence, with a particular focus on software engineering for AI (SE4AI). Specifically, I am interested in the reliability, testing, and repair of deep neural networks. My goal is to improve the robustness and deployment reliability of AI systems through principled testing prioritization and model repair techniques.


# 🔥 News
- *2026.06*: &nbsp;🎉 Our paper on *When Ambiguity Meets Atypicality: Dual-Perspective Test Input Prioritization for DNNs (DuFP)* has been **directly accepted** by **ASE 2026** (115/1,236 reviewed submissions, top 9.3%)!
- *2025.09*: &nbsp;🎉 Our paper on *SMiR: Minimizing Side-Effects in Repairing Specific Misclassifications for Deep Neural Networks* has been accepted by **TOSEM**! This is the first TOSEM paper in our group!

# 📝 Publications 

## Representative Works

<div class='paper-box'><div class='paper-box-image'><div><div class="badge">TOSEM</div><img src='images/smir_workflow.jpg' alt="sym" width="100%"></div></div>
<div class='paper-box-text' markdown="1">
[SMiR: Minimizing Side-Effects in Repairing Specific Misclassifications for Deep Neural Networks](https://dl.acm.org/doi/10.1145/3771545)


**Haoran Li**, Shihai Wang, Bin Liu, Tengfei Shi, Wentao Wu, Yu Liu

**TOSEM** (<span style="color:#d62728;"><strong>CCF-A</strong></span>, JCR-Q1)

<span class="paper-resources">
<span class="paper-link">
<a href="https://dl.acm.org/doi/pdf/10.1145/3771545"><strong>Paper</strong></a>
<a class="show_paper_citations" data-paper-title="SMiR: Minimizing Side-Effects in Repairing Specific Misclassifications for Deep Neural Networks" hidden><img class="citation-badge" alt="" height="20" decoding="async"></a>
</span> |
<span class="paper-code">
<a href="https://github.com/AnonymousSE4AI/SMiR"><strong>Code</strong></a>
<a class="repo-stars" href="https://github.com/AnonymousSE4AI/SMiR/stargazers" aria-label="SMiR GitHub stars"><img src="https://img.shields.io/github/stars/AnonymousSE4AI/SMiR?style=social" alt="SMiR GitHub stars" height="20" loading="lazy" decoding="async"></a>
</span>
</span>


-  We propose **SMiR**, an effective repair framework for addressing specific misclassifications with marginal accuracy loss. Rather than patching the original model, our method localizes and recovers the distorted feature dimensions to mitigate their negative impact on the distinction between specific classes. Moreover, SMiR narrows the scope of repair to the filtered suspect set, protecting other well-trained decision boundaries from disturbance. On average, our approach repairs 27%-36.2% more specific misclassifications than the baselines, while introducing only 7.8%-70.9% as many new errors. Besides, SMiR maintains state-of-the-art performance on safety-critical datasets.


</div>
</div>

<div class='paper-box'><div class='paper-box-image'><div><div class="badge">ASE-2026</div><img src='images/dufp_workflow.png' alt="sym" width="100%"></div></div>
<div class='paper-box-text' markdown="1">
[When Ambiguity Meets Atypicality: Dual-Perspective Test Input Prioritization for DNNs](https://doi.org/10.1145/3832783.3834351)


**Haoran Li**, Shihai Wang, Bin Liu, Jialuo Chen, Wenjing Zhu, Yu Liu, Tengfei Shi, Shudi Guo;

**ASE-2026** (<span style="color:#d62728;"><strong>CCF-A</strong></span>)

<span class="paper-resources">
<span class="paper-link">
<a href="https://doi.org/10.1145/3832783.3834351"><strong>Paper</strong></a>
<a class="show_paper_citations" data-paper-title="When Ambiguity Meets Atypicality: Dual-Perspective Test Input Prioritization for DNNs" hidden><img class="citation-badge" alt="" height="20" decoding="async"></a>
</span> |
<span class="paper-code">
<a href="https://github.com/Ryan-LHR/DuFP"><strong>Code</strong></a>
<a class="repo-stars" href="https://github.com/Ryan-LHR/DuFP/stargazers" aria-label="DuFP GitHub stars"><img src="https://img.shields.io/github/stars/Ryan-LHR/DuFP?style=social" alt="DuFP GitHub stars" height="20" loading="lazy" decoding="async"></a>
</span>
</span>


-  We propose **DuFP** (Dual perspective Feature space Prioritization), a KNN density-based test input prioritization approach for DNNs that jointly incorporates inter-class and intra-class perspectives. Built upon class-conditional density estimation, DuFP characterizes prediction correctness through an ambiguity score and an atypicality score, then integrates them into a hybrid uncertainty score to guide prioritization. Extensive evaluations on image and text datasets under clean, corrupted, and adversarial scenarios show that DuFP effectively and efficiently prioritizes failure-inducing inputs and outperforms state-of-the-art approaches.


</div>
</div>



## All Publications
- [CRICO: A Certified Robustness Framework via Input-Dependent Covariance Optimization](https://openreview.net/forum?id=96YE0mCm3P). Shudi Guo, Bin Liu, Shihai Wang, Tengfei Shi, Yu Liu, **Haoran Li**. The 2026 Conference on Empirical Methods in Natural Language Processing (**EMNLP**, CCF-B), 2026. Accepted.

- [AARN3: A software defect prediction model using atomic association rule networks based on three distinct minimum support thresholds](https://doi.org/10.1109/OJCS.2026.3691543). Wentao Wu, Xinan Liu, Hong Du, Yiding Liu, Xingxin Li, **Haoran Li**, Suxin Mo, Huaibo Shen, Runzi Guo. IEEE Open Journal of the Computer Society (**IEEE OJCS**, ESCI), 2026.

- [A slice-level software vulnerability detection method based on hyperbolic gated graph neural network](https://journal.hep.com.cn/fcs/EN/10.1007/s11704-026-50989-1). Yu Liu, Bin Liu, Shihai Wang, Tengfei Shi, **Haoran Li**, Shudi Guo. Frontiers of Computer Science (**FCS**, CCF-B, JCR-Q1), 2026.

- [An intelligent design system for tailored metamaterial properties](https://www.sciencedirect.com/science/article/abs/pii/S0020740324006362). Jipeng Cui, Yaoyu Wang, Liangchi Zhang, **Haoran Li**. International Journal of Mechanical Sciences (**IJMS**, JCR-Q1), 2024

- [TSDTest: An Efficient Coverage Guided Two-Stage Testing for Deep Learning Systems](https://ieeexplore.ieee.org/document/10077070). **Haoran Li**, Shihai Wang, Tengfei Shi, Xinyue Fang, Jian Chen. 2022 IEEE 22nd International Conference on Software Quality, Reliability, and Security Companion (QRS-C 2022), 2022.

- [Generating Adversarial Samples Based on the Attack Robust Training Model](https://ieeexplore.ieee.org/abstract/document/10727083). Tengfei Shi, Shihai Wang, **Haoran Li**, Shudi Guo, Yu Liu. 2024 IEEE 24th International Conference on Software Quality, Reliability, and Security Companion (QRS-C 2024), 2024.

# 🎖 Honors and Awards
- *2020.12* National Scholarship (Top 1%)
- *2020.05* Zhangjiagang Municipal Government Scholarship (Top 2%)

# 📖 Educations
- *2022.09 – now*, Ph.D. Student, Beihang University, School of Reliability and Systems Engineering (BUAA: China, Beijing)
- *2021.09 – 2022.08*, Master, Beihang University, School of Reliability and Systems Engineering (BUAA: China, Beijing)
- *2017.09 – 2021.07*, Undergraduate (**1/58**), Nanjing Tech University (NJTech: China, Nanjing)

# 💬 Talks & Presentations
{: #talks-presentations}

<ul class="talks-list">
  <li>
    <time class="talk-date" datetime="2026-10">2026.10</time>
    <div class="talk-body">
      <p class="talk-heading"><strong>ASE 2026</strong></p>
      <p class="talk-description">Presented "When Ambiguity Meets Atypicality: Dual-Perspective Test Input Prioritization for DNNs" at ASE 2026 in Munich, Germany, and participated in the poster presentation.</p>
    </div>
    <a class="talk-poster" href="images/dufp-ase2026-poster.png" aria-label="View the DuFP poster presented at ASE 2026">
      <img src="images/dufp-ase2026-poster-preview.webp" alt="DuFP poster presented at ASE 2026" width="80" height="113" loading="lazy" decoding="async">
    </a>
  </li>
  <li class="talk-no-poster">
    <time class="talk-date" datetime="2022-12">2022.12</time>
    <div class="talk-body">
      <p class="talk-heading"><strong>QRS 2022</strong></p>
      <p class="talk-description">Presented "TSDTest: An Efficient Coverage Guided Two-Stage Testing for Deep Learning Systems" at QRS 2022 online.</p>
    </div>
  </li>
</ul>

# 💻 Internships
- *2026.07–2026.08*, [Huawei](https://www.huawei.com/en/) - AI Application Algorithm Engineer, 2012 Laboratories, China.

# <i class="fas fa-code" aria-hidden="true"></i> Open-Source Projects
{: #open-source-projects}

<ul class="open-source-list">
  <li>
    <div class="project-heading">
      <div class="project-name">
        <a href="https://github.com/Ryan-LHR/Awesome-DNN-Testing-And-Repair"><strong>Awesome DNN Testing and Repair</strong></a>
        <a class="repo-stars" href="https://github.com/Ryan-LHR/Awesome-DNN-Testing-And-Repair/stargazers" aria-label="Awesome DNN Testing and Repair GitHub stars"><img src="https://img.shields.io/github/stars/Ryan-LHR/Awesome-DNN-Testing-And-Repair?style=social" alt="Awesome DNN Testing and Repair GitHub stars" height="20" loading="lazy" decoding="async"></a>
      </div>
      <span class="project-kind">Research Resource</span>
    </div>
    <p>A curated reading list for deep neural network testing and repair, covering coverage metrics, test generation, test selection and prioritization, and model repair. Includes surveys and empirical studies, with publication details and links to available papers and code.</p>
  </li>
</ul>

<div class="github-activity" data-username="Ryan-LHR" hidden>
  <div class="github-activity-summary">
    <strong>GitHub activity</strong>
    <span class="github-activity-total"></span>
    <span>contributions in the last year</span>
    <span class="github-activity-range"></span>
    <a href="https://github.com/Ryan-LHR">@Ryan-LHR <i class="fas fa-external-link-alt" aria-hidden="true"></i></a>
  </div>
  <div class="github-activity-chart">
    <div class="github-activity-calendar"></div>
    <div class="github-activity-legend" aria-hidden="true"><span>Less</span><i data-level="0"></i><i data-level="1"></i><i data-level="2"></i><i data-level="3"></i><i data-level="4"></i><span>More</span></div>
  </div>
</div>
