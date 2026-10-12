from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_study_notes_pdf(output_path: Path):
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#1E3A8A'),
        spaceAfter=14
    )
    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#2563EB'),
        spaceBefore=12,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#1F2937'),
        spaceAfter=8
    )
    bullet_style = ParagraphStyle(
        'DocBullet',
        parent=body_style,
        leftIndent=15,
        spaceAfter=4
    )

    story = []

    # --- PAGE 1: Machine Learning Foundations ---
    story.append(Paragraph("AI Study Guide: Foundations of Machine Learning", title_style))
    story.append(Paragraph("Page 1 | Chapter 1: Introduction to Machine Learning Paradigms", h2_style))
    story.append(Paragraph(
        "Machine Learning (ML) is a branch of artificial intelligence focused on building algorithms that learn patterns "
        "directly from training data to make predictions without explicit rules-based programming.",
        body_style
    ))
    story.append(Paragraph(
        "<b>1. Supervised Learning:</b> The algorithm learns from labeled pairs (features X, ground truth Y). "
        "Key tasks include classification (predicting discrete classes, e.g., spam vs ham) and regression (predicting continuous numeric values, e.g., housing prices). "
        "Common models: Linear Regression, Logistic Regression, Random Forests, and Support Vector Machines.",
        bullet_style
    ))
    story.append(Paragraph(
        "<b>2. Unsupervised Learning:</b> Training occurs on unlabeled data (features X only) to discover underlying cluster structures or reduce dimensions. "
        "Common algorithms include K-Means clustering, Hierarchical clustering, and Principal Component Analysis (PCA).",
        bullet_style
    ))
    story.append(Paragraph(
        "<b>3. Reinforcement Learning (RL):</b> An agent learns by taking actions within an environment to maximize cumulative reward signals. "
        "Central concepts include policy gradient, Q-learning, exploration vs exploitation trade-offs, and Markov Decision Processes (MDP).",
        bullet_style
    ))
    story.append(Paragraph(
        "<b>Gradient Descent and Optimization:</b> Machine learning models minimize an objective loss function L(theta). "
        "Weights are updated iteratively using the gradient of the loss with respect to parameters: theta = theta - alpha * grad(L), "
        "where alpha is the learning rate parameter. Stochastic Gradient Descent (SGD) and Adam optimizer are the most widely used optimizers.",
        body_style
    ))
    story.append(PageBreak())

    # --- PAGE 2: Deep Learning and Transformers ---
    story.append(Paragraph("AI Study Guide: Deep Learning & Transformers", title_style))
    story.append(Paragraph("Page 2 | Chapter 2: Deep Neural Networks and Self-Attention", h2_style))
    story.append(Paragraph(
        "Deep Learning utilizes layered artificial neural networks capable of learning hierarchical feature representations.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Artificial Neural Networks (ANN):</b> Composed of input layers, hidden layers with non-linear activation functions (ReLU, GELU, Sigmoid), "
        "and output layers. Backpropagation applies the calculus chain rule backwards across network layers to compute error gradients.",
        bullet_style
    ))
    story.append(Paragraph(
        "<b>Convolutional Neural Networks (CNN):</b> Specialized for spatial grid data such as computer vision and medical imaging. "
        "They utilize convolution kernels for translation invariance and spatial pooling layers to extract edge and shape hierarchies.",
        bullet_style
    ))
    story.append(Paragraph(
        "<b>The Transformer Architecture (Vaswani et al., 2017):</b> Replaced recurrent recurrent architectures (RNN/LSTM) by using Self-Attention. "
        "The Attention formula computes attention weights across tokens: Attention(Q, K, V) = softmax((Q * K^T) / sqrt(d_k)) * V, "
        "where Q (Query), K (Key), and V (Value) are linear projections of token embeddings.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Multi-Head Attention:</b> Allows the model to jointly attend to information from different representation subspaces at different positions. "
        "Modern Large Language Models like Google Gemini, GPT, and Claude rely on stacked transformer decoder or encoder-decoder blocks.",
        body_style
    ))
    story.append(PageBreak())

    # --- PAGE 3: RAG & Vector Databases ---
    story.append(Paragraph("AI Study Guide: Retrieval-Augmented Generation (RAG)", title_style))
    story.append(Paragraph("Page 3 | Chapter 3: RAG Architecture & Vector Search", h2_style))
    story.append(Paragraph(
        "Retrieval-Augmented Generation (RAG) is an architectural pattern that enhances Large Language Models by retrieving "
        "authoritative knowledge from external documents (such as textbooks, research PDFs, or internal notes) before answering queries.",
        body_style
    ))
    story.append(Paragraph(
        "<b>1. Document Ingestion and Chunking:</b> Large PDFs are split into digestible text segments with overlapping boundaries (e.g., 800 characters with 150 overlap). "
        "This preserves complete sentences and context across page boundaries.",
        bullet_style
    ))
    story.append(Paragraph(
        "<b>2. Semantic Vector Embeddings:</b> Neural embedding models (such as text-embedding-004) convert text chunks into dense numeric vectors in high-dimensional space. "
        "Semantically similar passages will lie close together regardless of exact keyword phrasing.",
        bullet_style
    ))
    story.append(Paragraph(
        "<b>3. Vector Indexing and Similarity Search:</b> Vector stores calculate distance metrics, predominantly Cosine Similarity: "
        "Cosine_Sim(A, B) = (A . B) / (||A|| * ||B||). Top-K nearest chunks are retrieved for any incoming student question.",
        bullet_style
    ))
    story.append(Paragraph(
        "<b>4. Grounded Prompt Synthesis:</b> The retrieved excerpts are dynamically injected into the system context prompt along with page citations. "
        "The LLM is instructed to answer strictly based on the retrieved excerpts, drastically eliminating hallucinations.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Key Study Takeaways for RAG:</b> RAG decouples model training from knowledge updates, enables instant citation verification to source page numbers, "
        "and keeps private academic documents secure without expensive fine-tuning.",
        body_style
    ))

    doc.build(story)
    print(f"Sample study PDF generated at {output_path}")

if __name__ == "__main__":
    out = Path(__file__).resolve().parent / "AI_Study_Guide_Notes.pdf"
    generate_study_notes_pdf(out)
