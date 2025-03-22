import { LightningElement, track } from 'lwc';
import getQuizByCode from '@salesforce/apex/QuizController.getQuizByCode';
import getQuizQuestions from '@salesforce/apex/QuizController.getQuizQuestions';
import getQuestionOptions from '@salesforce/apex/QuizController.getQuestionOptions';
import submitQuiz from '@salesforce/apex/QuizController.submitQuiz';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getUserAttempts from '@salesforce/apex/QuizController.getUserAttempts';
import { reduceErrors } from 'c/ldsUtils';
import USER_ID from '@salesforce/user/Id';

export default class QuizApp extends LightningElement {
    @track quizCode = '';
    @track quizId;
    @track questions = [];
    @track currentQuestionIndex = 0;
    @track selectedAnswers = {}; 
    @track showQuizEntry = true;
    @track showQuizQuestions = false;
    @track showQuizResults = false;
    @track score = 0;
    @track totalQuestions = 0;
    @track currentOptions = [];
    @track isMultipleChoice = false; 

    userId = USER_ID;

    get currentQuestionText() {
        return this.questions.length > 0 ? this.questions[this.currentQuestionIndex].Question_Text__c : '';
    }

    get isFirstQuestion() {
        return this.currentQuestionIndex === 0;
    }

    get isLastQuestion() {
        return this.currentQuestionIndex === this.questions.length - 1;
    }

    get isNotLastQuestion() {
        return !this.isLastQuestion;
    }

    get displayQuestionNumber() {
        return this.currentQuestionIndex + 1;
    }

    handleQuizCodeChange(event) {
        this.quizCode = event.target.value;
    }

    startQuiz() {
    
        getQuizByCode({ quizCode: this.quizCode })
            .then(result => {
                if (!result) {
                    throw new Error('Invalid Quiz Code');
                }
                this.quizId = result.Id;
                return getUserAttempts({ quizId: this.quizId });
            })
            .then(attemptCount => {
                if (attemptCount >= 3) {

                    throw new Error('Maximum attempts reached. You cannot take this quiz again.');
                }
                
                return getQuizQuestions({ quizId: this.quizId });
            })
            .then(questions => {
                this.questions = questions;
                this.totalQuestions = questions.length;
                return this.loadOptionsForQuestion();
            })
            .then(() => {
                this.showQuizEntry = false;
                this.showQuizQuestions = true;
            })
            .catch(error => {
                this.showToast('Error', error.message, 'error');
            });
    }

    loadOptionsForQuestion() {
        const currentQuestion = this.questions[this.currentQuestionIndex];

        this.isMultipleChoice = currentQuestion.Is_mutliple_correct__c;
        return getQuestionOptions({ questionId: currentQuestion.Id })
            .then(options => {
                this.currentOptions = options.map(option => ({
                    ...option,
                    isChecked: this.selectedAnswers[currentQuestion.Id]?.includes(option.Id) || false
                }));
            })
            .catch(error => {
                this.showToast('Error', 'Failed to load options', 'error');
            });
    }

    handleOptionSelect(event) {
        const currentQuestion = this.questions[this.currentQuestionIndex];
        const questionId = currentQuestion.Id;
        const optionId = event.target.dataset.id;
        const isChecked = event.target.checked;

        if (!this.selectedAnswers[questionId]) {
            this.selectedAnswers[questionId] = [];
        }

        if (this.isMultipleChoice) {
           
            if (isChecked) {
                if (!this.selectedAnswers[questionId].includes(optionId)) {
                    this.selectedAnswers[questionId].push(optionId);
                }
            } else {
                this.selectedAnswers[questionId] = this.selectedAnswers[questionId].filter(id => id !== optionId);
            }
        } else {
            this.selectedAnswers[questionId] = isChecked ? [optionId] : [];
        }

      
        this.currentOptions = this.currentOptions.map(option => ({
            ...option,
            isChecked: this.selectedAnswers[questionId]?.includes(option.Id) || false
        }));
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.loadOptionsForQuestion();
        }
    }

    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.loadOptionsForQuestion();
        }
    }

    submitQuiz() {
        submitQuiz({ quizId: this.quizId, userResponses: this.selectedAnswers })
            .then(score => {
                this.score = score;
                this.showQuizQuestions = false;
                this.showQuizResults = true;
            })
            .catch(error => {
            const errorMessage = reduceErrors(error)[0];
            this.showToast('Error', errorMessage, 'error');
            });
    }

    restartQuiz() {
        this.showQuizResults = false;
        this.showQuizEntry = true;
        this.quizCode = '';
        this.selectedAnswers = {};
        this.currentQuestionIndex = 0;
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
