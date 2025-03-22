public with sharing class QuizController {
    
    @AuraEnabled
    public static Quiz__c getQuizByCode(String quizCode) {
        try {
            if (!Schema.sObjectType.Quiz__c.isAccessible()) {
                throw new AuraHandledException('Insufficient permissions to access Quiz records');
            }
            
            for (Quiz__c quiz : [
                SELECT Id, Name FROM Quiz__c 
                WHERE Quiz_Code__c = :quizCode 
                AND Is_Active__c = TRUE LIMIT 1
            ]) {
                return quiz; 
            }

            return null;
    
        } catch (Exception e) {
            throw new AuraHandledException('An error occurred while fetching the quiz');
        }
    }

    @AuraEnabled
    public static Integer getUserAttempts(Id quizId) {
        Id userId = UserInfo.getUserId();
        if (!Schema.sObjectType.User_Quiz_Attempt__c.isAccessible()) {
            throw new AuraHandledException('Insufficient permissions to access User Quiz Attempt records');
        }
        return [SELECT COUNT() FROM User_Quiz_Attempt__c 
                WHERE User__c = :userId AND Quiz__c = :quizId];
    }

    @AuraEnabled
    public static List<Quiz_Question__c> getQuizQuestions(Id quizId) {
        if (!Schema.sObjectType.Quiz_Question__c.isAccessible()) {
            throw new AuraHandledException('Insufficient permissions to access Quiz Question records');
        }
        return [
            SELECT Id, Question_Text__c, Is_mutliple_correct__c
            FROM Quiz_Question__c WHERE Quiz__c = :quizId
        ];
    }

    @AuraEnabled
    public static List<Quiz_Options__c> getQuestionOptions(Id questionId) {
        if (!Schema.sObjectType.Quiz_Options__c.isAccessible()) {
            throw new AuraHandledException('Insufficient permissions to access Quiz Options records');
        }
        return [
            SELECT Id, Option_Text__c, Is_Correct__c 
            FROM Quiz_Options__c WHERE Quiz_Question__c = :questionId
        ];
    }

    @AuraEnabled
    public static Integer submitQuiz(Id quizId, Map<Id, List<Id>> userResponses) {
        Id userId = UserInfo.getUserId();
        
        if (!Schema.sObjectType.Quiz_Options__c.isAccessible()) {
            throw new AuraHandledException('Insufficient permissions to access Quiz Options records');
        }

        // Fetch the current attempt count
        Integer currentAttempts = getUserAttempts(quizId);
        Integer newAttemptNumber = currentAttempts + 1;
    
        Map<Id, Set<Id>> correctAnswersMap = new Map<Id, Set<Id>>();
        for (Quiz_Options__c opt : [
            SELECT Id, Quiz_Question__c FROM Quiz_Options__c WHERE Is_Correct__c = TRUE
        ]) {
            if (!correctAnswersMap.containsKey(opt.Quiz_Question__c)) {
                correctAnswersMap.put(opt.Quiz_Question__c, new Set<Id>());
            }
            correctAnswersMap.get(opt.Quiz_Question__c).add(opt.Id);
        }

        Integer score = 0;
        for (Id questionId : userResponses.keySet()) {
            Set<Id> correctAnswers = correctAnswersMap.get(questionId);
            Set<Id> userSelected = new Set<Id>(userResponses.get(questionId));
            if (userSelected == correctAnswers) {
                score++;
            }
        }

        User_Quiz_Attempt__c attempt = new User_Quiz_Attempt__c(
            User__c = userId,
            Quiz__c = quizId,
            Score__c = score,
            Status__c = 'Completed',
            Attempt_Number__c  = newAttemptNumber
        );
        if (Schema.sObjectType.User_Quiz_Attempt__c.isCreateable()) {
            insert attempt;
        } else {
            throw new AuraHandledException('Insufficient permissions to create User Quiz Attempt records');
        } 

        return score;
    }
}
