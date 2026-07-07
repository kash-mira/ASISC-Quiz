const { useState, useEffect, useCallback, useMemo } = React;

// List of category data files to load from the /data folder.
// Each file contains: { "category": "<Display Name>", "questions": [...] }
const DATA_FILES = [
    "data/current_affairs.json",
    "data/science.json",
    "data/history.json",
    "data/geography.json",
    "data/literature.json",
    "data/sports.json",
    "data/environment.json",
    "data/arts.json",
    "data/ai.json"
];

// Quiz Mode Component
const QuizPlatform = () => {
    const [questionBank, setQuestionBank] = useState({});
    const [dataLoading, setDataLoading] = useState(true);
    const [dataError, setDataError] = useState(null);

    const [currentMode, setCurrentMode] = useState("dashboard");
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [quizStarted, setQuizStarted] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [quizQuestions, setQuizQuestions] = useState([]);
    
    // Local state for tracking selections before submission
    const [matchingSelections, setMatchingSelections] = useState({});
    const [multipleSelections, setMultipleSelections] = useState([]);
    const [fillBlankSelection, setFillBlankSelection] = useState("");

    // Load all category question banks from the data/ folder
    useEffect(() => {
        const loadData = async () => {
            try {
                const responses = await Promise.all(
                    DATA_FILES.map((file) => fetch(file).then((res) => {
                        if (!res.ok) throw new Error(`Failed to load ${file}`);
                        return res.json();
                    }))
                );

                const bank = {};
                responses.forEach((entry) => {
                    bank[entry.category] = entry.questions;
                });

                setQuestionBank(bank);
            } catch (err) {
                console.error(err);
                setDataError("Failed to load quiz data. Please check the data/ folder and try again.");
            } finally {
                setDataLoading(false);
            }
        };

        loadData();
    }, []);

    const allQuestions = Object.values(questionBank).flat();
    const totalQuestions = allQuestions.length;

    // Timer effect
    useEffect(() => {
        if (timeRemaining === null || timeRemaining <= 0) return;
        const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
        return () => clearTimeout(timer);
    }, [timeRemaining]);

    // Reset local selections when moving to a new question
    useEffect(() => {
        setMatchingSelections({});
        setMultipleSelections([]);
        setFillBlankSelection("");
    }, [currentQuestionIndex]);

    // Memoize randomized right-side options for matching questions
    // This keeps the dropdown order stable while the user is answering
    const randomizedRightSides = useMemo(() => {
        const currentQuestion = quizQuestions[currentQuestionIndex];
        if (currentQuestion?.type !== "matching") return [];
        
        const rightSides = currentQuestion.pairs.map(p => p[1]);
        // Fisher-Yates shuffle
        for (let i = rightSides.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rightSides[i], rightSides[j]] = [rightSides[j], rightSides[i]];
        }
        return rightSides;
    }, [currentQuestionIndex, quizQuestions]);

    const startQuiz = (category) => {
        const questions = category ? questionBank[category] : allQuestions;
        setQuizQuestions(questions);
        setSelectedCategory(category);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setTimeRemaining(questions.length * 120);
        setQuizStarted(true);
        setCurrentMode("quiz");
    };

    const submitAnswer = (answer) => {
        if (answers[currentQuestionIndex] !== undefined) return;

        setAnswers(prev => ({
            ...prev,
            [currentQuestionIndex]: answer
        }));
    };

    const nextQuestion = () => {
        if (currentQuestionIndex < quizQuestions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            completeQuiz();
        }
    };

    const previousQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const completeQuiz = () => {
        setShowResults(true);
        setCurrentMode("results");
    };

    const calculateScore = () => {
        let correct = 0;
        quizQuestions.forEach((q, idx) => {
            const userAnswer = answers[idx];
            if (userAnswer === undefined) return;

            if (q.type === "matching") {
                // Ensure all parts of the matching question are correct
                let allCorrect = true;
                q.pairs.forEach((pair, pIdx) => {
                    if (userAnswer[pIdx] !== pair[1]) {
                        allCorrect = false;
                    }
                });
                if (allCorrect) correct++;
            } else if (q.type === "fill-blank") {
                if (String(userAnswer).toLowerCase() === String(q.answer).toLowerCase()) correct++;
            } else if (Array.isArray(q.answer)) {
                if (JSON.stringify(userAnswer?.sort()) === JSON.stringify(q.answer.sort())) correct++;
            } else if (userAnswer === q.answer) {
                correct++;
            }
        });
        return { correct, total: quizQuestions.length };
    };

    const getOptionClass = (optionValue) => {
        const currentQuestion = quizQuestions[currentQuestionIndex];
        const userAnswer = answers[currentQuestionIndex];

        if (userAnswer === undefined) return "";

        if (Array.isArray(currentQuestion.answer)) {
            if (currentQuestion.answer.includes(optionValue))
                return "correct disabled";

            if (
                Array.isArray(userAnswer) &&
                userAnswer.includes(optionValue)
            )
                return "wrong disabled";

            return "disabled";
        }

        if (optionValue === currentQuestion.answer)
            return "correct disabled";

        if (optionValue === userAnswer)
            return "wrong disabled";

        return "disabled";
    };

    const renderDashboard = () => (
        <div className="sidebar-layout">
            <div className="sidebar">
                <h3>📚 Categories</h3>
                <div className="category-list">
                    <button
                        className={`category-btn ${selectedCategory === null ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(null)}
                    >
                        All Questions
                        <span className="category-count">{totalQuestions}</span>
                    </button>
                    {Object.entries(questionBank).map(([category, questions]) => (
                        <button
                            key={category}
                            className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(category)}
                        >
                            {category}
                            <span className="category-count">{questions.length}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <div className="mode-selector">
                    <div className="mode-card active" onClick={() => startQuiz(selectedCategory)}>
                        <div className="mode-icon">📝</div>
                        <div className="mode-title">Practice Mode</div>
                        <div className="mode-description">Learn at your own pace</div>
                    </div>
                    <div className="mode-card" onClick={() => startQuiz(selectedCategory)}>
                        <div className="mode-icon">⚡</div>
                        <div className="mode-title">Timed Mode</div>
                        <div className="mode-description">Beat the clock</div>
                    </div>
                    <div className="mode-card" onClick={() => startQuiz(selectedCategory)}>
                        <div className="mode-icon">🎯</div>
                        <div className="mode-title">Quick Fire</div>
                        <div className="mode-description">Rapid questions</div>
                    </div>
                </div>

                <div className="quiz-container">
                    <h2>📊 Quiz Statistics</h2>
                    <div className="analytics-grid">
                        <div className="analytics-card">
                            <h3>Total Questions</h3>
                            <div className="analytics-value">{totalQuestions}</div>
                        </div>
                        <div className="analytics-card">
                            <h3>Categories</h3>
                            <div className="analytics-value">{Object.keys(questionBank).length}</div>
                        </div>
                        <div className="analytics-card success">
                            <h3>Question Types</h3>
                            <div className="analytics-value">8+</div>
                        </div>
                        <div className="analytics-card">
                            <h3>Coverage</h3>
                            <div className="analytics-value">Wide</div>
                        </div>
                    </div>

                    <h3 style={{ marginTop: "2rem", marginBottom: "1rem" }}>📚 Question Types Available</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                        {["MCQ", "True/False", "Multiple Correct", "Assertion-Reason", "Matching", "Fill Blank", "Image-Based", "Audio"].map(type => (
                            <div key={type} style={{ background: "var(--light)", padding: "1rem", borderRadius: "8px", textAlign: "center" }}>
                                {type}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderQuiz = () => {
        if (!quizQuestions.length) return null;

        const currentQuestion = quizQuestions[currentQuestionIndex];
        const isAnswered = answers[currentQuestionIndex] !== undefined;

        return (
            <div className="quiz-container">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
                    <div style={{ flex: 1 }}>
                        <div className="progress-info">
                            <span>Question {currentQuestionIndex + 1} of {quizQuestions.length}</span>
                            {timeRemaining && <span className={`timer ${timeRemaining < 60 ? 'danger' : timeRemaining < 300 ? 'warning' : ''}`}>⏱️ {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}</span>}
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="question-card">
                    <div className="question-header">
                        <span className="question-number">Q{currentQuestionIndex + 1}</span>
                        <span className={`question-difficulty difficulty-${currentQuestion.difficulty}`}>{currentQuestion.difficulty}</span>
                    </div>

                    <span className="question-type-badge">{currentQuestion.type.toUpperCase()}</span>

                    <h3 className="question-text">{currentQuestion.text}</h3>

                    {/* Render based on question type */}
                    {currentQuestion.type === "mcq" && (
                        <div className="options-container">
                            {currentQuestion.options.map((option, idx) => {
                                const letter = String.fromCharCode(65 + idx);

                                return (
                                    <div
                                        key={idx}
                                        className={`option ${getOptionClass(letter)}`}
                                        onClick={() => submitAnswer(letter)}
                                    >
                                        <span className="option-letter">
                                            {letter}
                                        </span>

                                        <span className="option-text">
                                            {option}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {currentQuestion.type === "true-false" && (
                        <div className="options-container">
                            <div
                                className={`option ${getOptionClass(true)}`}
                                onClick={() => submitAnswer(true)}
                            >
                                <span className="option-letter">T</span>
                                <span className="option-text">True</span>
                            </div>
                            <div
                                className={`option ${getOptionClass(false)}`}
                                onClick={() => submitAnswer(false)}
                            >
                                <span className="option-letter">F</span>
                                <span className="option-text">False</span>
                            </div>
                        </div>
                    )}

                    {currentQuestion.type === "multiple-correct" && (
                        <div style={{ marginTop: "1rem" }}>
                            <div className="options-container">
                                {currentQuestion.options.map((option, idx) => {
                                    const letter = String.fromCharCode(65 + idx);
                                    const isSelected = isAnswered 
                                        ? answers[currentQuestionIndex].includes(letter)
                                        : multipleSelections.includes(letter);
                                    
                                    let optionClass = "";
                                    if (isAnswered) {
                                        if (currentQuestion.answer.includes(letter)) optionClass = "correct disabled";
                                        else if (isSelected) optionClass = "wrong disabled";
                                        else optionClass = "disabled";
                                    } else {
                                        optionClass = isSelected ? "selected" : "";
                                    }

                                    return (
                                        <div
                                            key={idx}
                                            className={`option ${optionClass}`}
                                            onClick={() => {
                                                if (isAnswered) return;
                                                setMultipleSelections(prev => 
                                                    prev.includes(letter) ? prev.filter(l => l !== letter) : [...prev, letter]
                                                );
                                            }}
                                        >
                                            <span className="option-letter" style={{ fontSize: "1.2rem" }}>☐</span>
                                            <span className="option-text">{option}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            {!isAnswered && multipleSelections.length > 0 && (
                                <button 
                                    className="btn btn-primary" 
                                    style={{ marginTop: "1.5rem", width: "100%", padding: "1rem", fontSize: "1.1rem" }}
                                    onClick={() => submitAnswer(multipleSelections)}
                                >
                                    Check Answer
                                </button>
                            )}
                        </div>
                    )}

                    {currentQuestion.type === "matching" && (
                        <div style={{ marginTop: "1rem" }}>
                            {currentQuestion.pairs.map((pair, idx) => {
                                const leftSide = pair[0];
                                const correctRightSide = pair[1];
                                const selectedVal = isAnswered ? answers[currentQuestionIndex][idx] : (matchingSelections[idx] || "");
                                const isRowCorrect = selectedVal === correctRightSide;

                                let rowBg = "var(--light, #f8f9fa)";
                                let rowBorder = "1px solid var(--border, #dee2e6)";
                                
                                if (isAnswered) {
                                    rowBg = isRowCorrect ? "#d4edda" : "#f8d7da";
                                    rowBorder = isRowCorrect ? "1px solid #c3e6cb" : "1px solid #f5c6cb";
                                }

                                return (
                                    <div key={idx} style={{ 
                                        display: "flex", 
                                        alignItems: "center", 
                                        justifyContent: "space-between",
                                        padding: "1rem", 
                                        marginBottom: "0.5rem", 
                                        background: rowBg, 
                                        border: rowBorder,
                                        borderRadius: "8px",
                                        flexWrap: "wrap",
                                        gap: "1rem"
                                    }}>
                                        <div style={{ flex: "1 1 40%", fontWeight: "bold" }}>{leftSide}</div>
                                        <div style={{ flex: "1 1 50%", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                            <select 
                                                value={selectedVal}
                                                onChange={(e) => setMatchingSelections(prev => ({...prev, [idx]: e.target.value}))}
                                                disabled={isAnswered}
                                                style={{
                                                    padding: "0.75rem",
                                                    borderRadius: "6px",
                                                    border: "1px solid #ccc",
                                                    width: "100%",
                                                    fontSize: "1rem",
                                                    background: isAnswered ? "rgba(255,255,255,0.5)" : "#fff",
                                                    cursor: isAnswered ? "not-allowed" : "pointer"
                                                }}
                                            >
                                                <option value="" disabled>Select ▼</option>
                                                {randomizedRightSides.map((opt, i) => (
                                                    <option key={i} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                            {isAnswered && !isRowCorrect && (
                                                <div style={{ color: "#721c24", fontSize: "0.9rem", fontWeight: "bold" }}>
                                                    Correct Match: {correctRightSide}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {!isAnswered && Object.keys(matchingSelections).length === currentQuestion.pairs.length && (
                                <button 
                                    className="btn btn-primary" 
                                    style={{ marginTop: "1.5rem", width: "100%", padding: "1rem", fontSize: "1.1rem" }}
                                    onClick={() => submitAnswer(matchingSelections)}
                                >
                                    Check Answer
                                </button>
                            )}
                        </div>
                    )}

                    {currentQuestion.type === "assertion-reason" && (
                        <div style={{ marginTop: "1rem" }}>
                            <div className="options-container">
                                {["A", "B", "C", "D"].map(letter => {
                                    let text = "";
                                    if (letter === "A") text = "Both assertion and reason are true, and reason correctly explains assertion";
                                    if (letter === "B") text = "Both are true, but reason does not explain assertion";
                                    if (letter === "C") text = "Assertion is true, reason is false";
                                    if (letter === "D") text = "Assertion is false, reason is true";
                                    
                                    return (
                                        <div 
                                            key={letter} 
                                            className={`option ${getOptionClass(letter)}`} 
                                            onClick={() => submitAnswer(letter)}
                                        >
                                            <span className="option-letter">{letter}</span>
                                            <span className="option-text">{text}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {currentQuestion.type === "fill-blank" && (
                        <div style={{ marginTop: "1rem" }}>
                            <input
                                type="text"
                                placeholder="Enter your answer"
                                value={isAnswered ? answers[currentQuestionIndex] : fillBlankSelection}
                                onChange={(e) => {
                                    if (!isAnswered) setFillBlankSelection(e.target.value);
                                }}
                                disabled={isAnswered}
                                style={{
                                    width: "100%",
                                    padding: "1rem",
                                    borderRadius: "8px",
                                    border: isAnswered 
                                        ? (String(answers[currentQuestionIndex]).toLowerCase() === String(currentQuestion.answer).toLowerCase() 
                                            ? "2px solid #28a745" 
                                            : "2px solid #dc3545")
                                        : "2px solid var(--border)",
                                    backgroundColor: isAnswered 
                                        ? (String(answers[currentQuestionIndex]).toLowerCase() === String(currentQuestion.answer).toLowerCase() 
                                            ? "#d4edda" 
                                            : "#f8d7da")
                                        : "#fff",
                                    fontSize: "1rem",
                                    outline: "none"
                                }}
                            />
                            {!isAnswered && fillBlankSelection.trim() !== "" && (
                                <button 
                                    className="btn btn-primary" 
                                    style={{ marginTop: "1.5rem", width: "100%", padding: "1rem", fontSize: "1.1rem" }}
                                    onClick={() => submitAnswer(fillBlankSelection.trim())}
                                >
                                    Check Answer
                                </button>
                            )}
                            {isAnswered && String(answers[currentQuestionIndex]).toLowerCase() !== String(currentQuestion.answer).toLowerCase() && (
                                <div style={{ marginTop: "1rem", color: "#721c24", fontWeight: "bold" }}>
                                    Correct Answer: {currentQuestion.answer}
                                </div>
                            )}
                        </div>
                    )}

                    {isAnswered && (
                        <div className="answer-explanation">
                            <div className="explanation-title">✓ Explanation</div>
                            <div className="explanation-text">{currentQuestion.explanation}</div>
                        </div>
                    )}
                </div>

                <div className="navigation">
                    <button className="btn btn-secondary" onClick={previousQuestion} disabled={currentQuestionIndex === 0}>
                        ← Previous
                    </button>
                    <button className="btn btn-primary" onClick={nextQuestion}>
                        {currentQuestionIndex === quizQuestions.length - 1 ? "Submit Quiz" : "Next →"}
                    </button>
                </div>
            </div>
        );
    };

    const renderResults = () => {
        const { correct, total } = calculateScore();
        const percentage = Math.round((correct / total) * 100);
        const categoryPerformance = {};

        Object.keys(questionBank).forEach(category => {
            let catCorrect = 0;
            let catTotal = 0;
            questionBank[category].forEach(q => {
                const idx = quizQuestions.findIndex(qz => qz.id === q.id);
                if (idx !== -1) {
                    catTotal++;
                    const userAnswer = answers[idx];
                    
                    if (q.type === "matching") {
                        if (userAnswer !== undefined) {
                            let allCorrect = true;
                            q.pairs.forEach((pair, pIdx) => {
                                if (userAnswer[pIdx] !== pair[1]) allCorrect = false;
                            });
                            if (allCorrect) catCorrect++;
                        }
                    } else if (q.type === "fill-blank") {
                        if (userAnswer !== undefined && String(userAnswer).toLowerCase() === String(q.answer).toLowerCase()) {
                            catCorrect++;
                        }
                    } else if (Array.isArray(q.answer)) {
                        if (JSON.stringify(userAnswer?.sort()) === JSON.stringify(q.answer.sort())) {
                            catCorrect++;
                        }
                    } else if (userAnswer === q.answer) {
                        catCorrect++;
                    }
                }
            });
            categoryPerformance[category] = { correct: catCorrect, total: catTotal };
        });

        return (
            <div className="quiz-container">
                <div className="result-screen">
                    <h1>🎉 Quiz Complete!</h1>
                    <div className="result-score">{correct}/{total}</div>
                    <div className="result-percentage">{percentage}%</div>
                    <div className="result-message">
                        {percentage >= 80 ? "🌟 Excellent Performance!" : percentage >= 60 ? "👍 Good Job!" : "📚 Keep Learning!"}
                    </div>

                    <div className="result-breakdown">
                        <div className="result-stat">
                            <div className="result-stat-value">{correct}</div>
                            <div className="result-stat-label">Correct</div>
                        </div>
                        <div className="result-stat">
                            <div className="result-stat-value">{total - correct}</div>
                            <div className="result-stat-label">Incorrect</div>
                        </div>
                        <div className="result-stat">
                            <div className="result-stat-value">{percentage}%</div>
                            <div className="result-stat-label">Accuracy</div>
                        </div>
                        <div className="result-stat">
                            <div className="result-stat-value">{selectedCategory || "Mixed"}</div>
                            <div className="result-stat-label">Category</div>
                        </div>
                    </div>

                    {Object.keys(categoryPerformance).some(cat => categoryPerformance[cat].total > 0) && (
                        <div style={{ marginTop: "2rem", textAlign: "left" }}>
                            <h3>Category Breakdown:</h3>
                            {Object.entries(categoryPerformance).map(([cat, perf]) => perf.total > 0 && (
                                <div key={cat} style={{ marginTop: "1rem", padding: "1rem", background: "var(--light)", borderRadius: "8px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                        <strong>{cat}</strong>
                                        <span>{perf.correct}/{perf.total}</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${(perf.correct / perf.total) * 100}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="navigation" style={{ marginTop: "2rem", justifyContent: "center" }}>
                        <button className="btn btn-primary" onClick={() => {
                            setCurrentMode("dashboard");
                            setQuizStarted(false);
                            setShowResults(false);
                        }}>
                            Take Another Quiz
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (dataLoading) {
        return (
            <div className="app-container">
                <div className="quiz-container" style={{ textAlign: "center" }}>
                    <h2>Loading quiz data…</h2>
                </div>
            </div>
        );
    }

    if (dataError) {
        return (
            <div className="app-container">
                <div className="quiz-container" style={{ textAlign: "center" }}>
                    <h2>⚠️ {dataError}</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <div className="header">
                <div>
                    <h1>🎓 ASISC Quiz Master</h1>
                    <div className="stats">Comprehensive Platform for Classes VI-XII</div>
                </div>
                <div className="header-stats">
                    <div className="stat-item">
                        <div className="stat-value">{totalQuestions}+</div>
                        <div className="stat-label">Questions</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">{Object.keys(questionBank).length}</div>
                        <div className="stat-label">Categories</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">8+</div>
                        <div className="stat-label">Question Types</div>
                    </div>
                </div>
            </div>

            <div className="main-content">
                {currentMode === "dashboard" && renderDashboard()}
                {currentMode === "quiz" && renderQuiz()}
                {currentMode === "results" && renderResults()}
            </div>
        </div>
    );
};

// Render the app
ReactDOM.createRoot(document.getElementById("root")).render(<QuizPlatform />);
