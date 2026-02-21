---
permalink: /
title: "Haoran Li"
excerpt: "PhD Candidate, AI & Software Engineering"
author_profile: true
redirect_from: 
  - /about/
  - /about.html
---

{% if site.google_scholar_stats_use_cdn %}
{% assign gsDataBaseUrl = "https://cdn.jsdelivr.net/gh/" | append: site.repository | append: "@" %}
{% else %}
{% assign gsDataBaseUrl = "https://raw.githubusercontent.com/" | append: site.repository | append: "/" %}
{% endif %}
{% assign url = gsDataBaseUrl | append: "google-scholar-stats/gs_data_shieldsio.json" %}

<span class='anchor' id='about-me'></span>

I am a Ph.D. candidate in Systems Engineering at Beihang University, advised by Prof. Shihai Wang. My research lies at the intersection of software engineering and trustworthy artificial intelligence, with a particular focus on software engineering for AI (SE4AI). Specifically, I am interested in the reliability, testing, and repair of deep neural networks. My goal is to improve the robustness and deployment reliability of AI systems through principled testing prioritization and model repair techniques.

<!--I have published more than 100 papers at the top international AI conferences with total <a href='https://scholar.google.com/citations?user=DhtAFkwAAAAJ'>google scholar citations <strong><span id='total_cit'>260000+</span></strong></a> (You can also use google scholar badge <a href='https://scholar.google.com/citations?user=DhtAFkwAAAAJ'><img src="https://img.shields.io/endpoint?url={{ url | url_encode }}&logo=Google%20Scholar&labelColor=f6f6f6&color=9cf&style=flat&label=citations"></a>).-->


# 🔥 News
- *2025.09*: &nbsp;🎉 Our paper on *Minimizing Side-Effects when Repairing Specific Misclassifications for Deep Neural Networks (SMiR)* has been accepted by **TOSEM**! This is the first TOSEM paper in our group!

# 📝 Publications 

## Representative Works

<div class='paper-box'><div class='paper-box-image'><div><div class="badge">TOSEM</div><img src='images/smir_workflow.jpg' alt="sym" width="100%"></div></div>
<div class='paper-box-text' markdown="1">
[SMiR: Minimizing Side-Effects in Repairing Specific Misclassifications for Deep Neural Networks](https://dl.acm.org/doi/10.1145/3771545)


**Haoran Li**, Shihai Wang, Bin Liu, Shiteng Fei, Wentao Wu, Yu Liu

**TOSEM** (<span style="color:#d62728;"><strong>CCF-A</strong></span>)

<span>
<a href="https://dl.acm.org/doi/pdf/10.1145/3771545"><strong>Paper</strong></a> |
<a href="https://github.com/AnonymousSE4AI/SMiR"><strong>Code</strong></a>
<!-- <strong><span class="show_paper_citations" data="DhtAFkwAAAAJ:ALROH1vI_8AC"></span></strong> -->
</span>


-  We propose **SMiR**, an effective repair framework for addressing specific misclassifications with marginal accuracy loss. Rather than patching the original model, our method localizes and recovers the distorted feature dimensions to mitigate their negative impact on the distinction between specific classes. Moreover, SMiR narrows the scope of repair to the filtered suspect set, protecting other well-trained decision boundaries from disturbance. On average, our approach repairs 27%-36.2% more specific misclassifications than the baselines, while introducing only 7.8%-70.9% as many new errors. Besides, SMiR maintains state-of-the-art performance on safety-critical datasets.

</div>
</div>



## All Publications
- A slice-level software vulnerability detection method based on hyperbolic gated graph neural network. Yu Liu, Bin Liu, Shihai Wang, Tengfei Shi, **Haoran Li**, Shudi Guo. Frontiers of Computer Science (**FCS**, CCF-B, JCR-Q1), 2026.

- [An intelligent design system for tailored metamaterial properties](https://www.sciencedirect.com/science/article/abs/pii/S0020740324006362). Jipeng Cui, Yaoyu Wang, Liangchi Zhang, **Haoran Li**. International Journal of Mechanical Sciences (**IJMS**, JCR-Q1), 2024

- [TSDTest: A Efficient Coverage Guided Two-Stage Testing for Deep Learning Systems](https://ieeexplore.ieee.org/document/10077070). **Haoran Li**, Shihai Wang, Tengfei Shi, Xinyue Fang, Jian Chen. 2022 IEEE 22nd International Conference on Software Quality, Reliability, and Security Companion (QRS-C 2022), 2022.

- [Generating Adversarial Samples Based on the Attack Robust Training Model](https://ieeexplore.ieee.org/abstract/document/10727083). Tengfei Shi, Shihai Wang, Haoran Li, Shudi Guo, Yu Liu. 2024 IEEE 24nd International Conference on Software Quality, Reliability, and Security Companion (QRS-C 2024), 2024.

# 🎖 Honors and Awards
- *2020.12* National Scholarship (Top 1%)
- *2020.05* Zhangjiagang Municipal Government Scholarship (Top 2%)

# 📖 Educations
- *2022.09 – now*, Ph.D. Student, Beihang University, School of Reliability and Systems Engineering (BUAA: China, Beijing)
- *2021.09 – 2022.08*, Master, Beihang University, School of Reliability and Systems Engineering (BUAA: China, Beijing)
- *2017.09 – 2021.07*, Undergraduate (**1/58**), Nanjing Tech University (NJTech: China, Nanjing)

# 💬 Invited Talks
- <!--*2021.06*, Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus ornare aliquet ipsum, ac tempus justo dapibus sit amet. -->

# 💻 Internships
- *20xx.05 - 20xx.07, [Huawei](https://github.com/), China.