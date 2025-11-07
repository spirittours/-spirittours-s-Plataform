/**
 * HR Recruitment Agent
 * AI-powered recruitment and CV management system
 * 
 * Features:
 * - CV parsing and analysis
 * - Candidate matching
 * - Interview scheduling
 * - Skill assessment
 * - Candidate ranking
 * - Automated screening
 * - Web portal integration
 */

const { MultiModelAI } = require('../../ai/MultiModelAI');
const { EventEmitter } = require('events');

class HRRecruitmentAgent extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      model: config.model || 'gpt-4o-mini',
      autoScreening: config.autoScreening !== false,
      matchingThreshold: config.matchingThreshold || 70, // percentage
      maxCandidates: config.maxCandidates || 50,
      ...config
    };

    this.ai = new MultiModelAI();
    
    // Job positions available
    this.positions = {
      'travel-agent': {
        skills: ['customer service', 'sales', 'communication', 'travel knowledge'],
        experience: 2,
        languages: ['spanish', 'english'],
        certifications: []
      },
      'tour-guide': {
        skills: ['public speaking', 'local knowledge', 'customer service', 'leadership'],
        experience: 1,
        languages: ['spanish', 'english'],
        certifications: ['tour guide license']
      },
      'operations-manager': {
        skills: ['management', 'logistics', 'problem solving', 'leadership'],
        experience: 5,
        languages: ['spanish', 'english'],
        certifications: []
      },
      'marketing-specialist': {
        skills: ['digital marketing', 'social media', 'content creation', 'analytics'],
        experience: 3,
        languages: ['spanish', 'english'],
        certifications: ['google analytics', 'digital marketing']
      },
      'customer-service': {
        skills: ['customer service', 'communication', 'problem solving', 'empathy'],
        experience: 1,
        languages: ['spanish'],
        certifications: []
      }
    };

    // Screening questions templates
    this.screeningQuestions = {
      general: [
        '¿Por qué te interesa trabajar en turismo?',
        '¿Qué experiencia tienes en atención al cliente?',
        '¿Cuál es tu disponibilidad horaria?',
        '¿Qué idiomas hablas y a qué nivel?'
      ],
      specific: {
        'travel-agent': [
          '¿Qué destinos conoces personalmente?',
          '¿Tienes experiencia con sistemas de reservas?',
          '¿Cuál fue tu mayor logro en ventas?'
        ],
        'tour-guide': [
          '¿Qué tours o destinos conoces mejor?',
          '¿Tienes experiencia hablando en público?',
          '¿Cómo manejas grupos difíciles?'
        ]
      }
    };
  }

  /**
   * Parse and analyze CV
   */
  async parseCVContent(cvContent, fileType = 'pdf') {
    this.emit('cv:parsing', { fileType });

    try {
      // Use AI to extract structured data from CV
      const parsed = await this.extractCVData(cvContent);

      // Analyze skills and experience
      const analysis = await this.analyzeCVQuality(parsed);

      // Match with available positions
      const matches = await this.matchPositions(parsed);

      const result = {
        success: true,
        parsed,
        analysis,
        matches,
        parsedAt: new Date()
      };

      this.emit('cv:parsed', { candidateName: parsed.personalInfo?.name, matches: matches.length });

      return result;
    } catch (error) {
      this.emit('cv:parsing_error', { error: error.message });
      throw error;
    }
  }

  /**
   * Extract structured data from CV text
   */
  async extractCVData(cvContent) {
    const prompt = `Extract structured information from this CV:

${cvContent}

Extract:
1. Personal Information (name, email, phone, location)
2. Professional Summary
3. Work Experience (company, position, duration, responsibilities)
4. Education (degree, institution, year)
5. Skills (technical and soft skills)
6. Languages (language and proficiency level)
7. Certifications
8. References (if available)

Format as JSON with these sections: personalInfo, summary, experience, education, skills, languages, certifications, references`;

    const response = await this.ai.processRequest({
      prompt,
      model: this.config.model,
      temperature: 0.2,
      maxTokens: 1500
    });

    try {
      return JSON.parse(response.response);
    } catch (error) {
      return {
        personalInfo: {},
        summary: '',
        experience: [],
        education: [],
        skills: [],
        languages: [],
        certifications: [],
        references: []
      };
    }
  }

  /**
   * Analyze CV quality
   */
  async analyzeCVQuality(parsedCV) {
    const prompt = `Analyze the quality of this CV:

Personal Info: ${JSON.stringify(parsedCV.personalInfo)}
Summary: ${parsedCV.summary}
Experience: ${parsedCV.experience?.length || 0} positions
Education: ${parsedCV.education?.length || 0} degrees
Skills: ${parsedCV.skills?.join(', ') || 'none listed'}
Languages: ${parsedCV.languages?.map(l => l.language).join(', ') || 'none listed'}

Evaluate:
1. Completeness (0-100)
2. Experience relevance for tourism industry (0-100)
3. Presentation quality (0-100)
4. Red flags or concerns
5. Strong points
6. Areas needing clarification

Format as JSON with: completeness, relevance, presentation, redFlags, strengths, clarificationNeeded`;

    const response = await this.ai.processRequest({
      prompt,
      model: this.config.model,
      temperature: 0.3,
      maxTokens: 600
    });

    try {
      return JSON.parse(response.response);
    } catch (error) {
      return {
        completeness: 50,
        relevance: 50,
        presentation: 50,
        redFlags: [],
        strengths: [],
        clarificationNeeded: []
      };
    }
  }

  /**
   * Match candidate with available positions
   */
  async matchPositions(parsedCV) {
    const matches = [];

    for (const [positionId, requirements] of Object.entries(this.positions)) {
      const score = await this.calculateMatchScore(parsedCV, requirements);

      if (score.total >= this.config.matchingThreshold) {
        matches.push({
          position: positionId,
          score: score.total,
          breakdown: score.breakdown,
          recommendation: score.recommendation
        });
      }
    }

    // Sort by score
    matches.sort((a, b) => b.score - a.score);

    return matches;
  }

  /**
   * Calculate match score for a position
   */
  async calculateMatchScore(parsedCV, requirements) {
    const scores = {
      skills: 0,
      experience: 0,
      languages: 0,
      certifications: 0
    };

    // Skills matching
    const candidateSkills = parsedCV.skills?.map(s => s.toLowerCase()) || [];
    const requiredSkills = requirements.skills.map(s => s.toLowerCase());
    const matchedSkills = requiredSkills.filter(skill => 
      candidateSkills.some(cs => cs.includes(skill) || skill.includes(cs))
    );
    scores.skills = (matchedSkills.length / requiredSkills.length) * 100;

    // Experience matching
    const totalYears = this.calculateTotalExperience(parsedCV.experience);
    scores.experience = Math.min((totalYears / requirements.experience) * 100, 100);

    // Languages matching
    const candidateLanguages = parsedCV.languages?.map(l => l.language.toLowerCase()) || [];
    const requiredLanguages = requirements.languages.map(l => l.toLowerCase());
    const matchedLanguages = requiredLanguages.filter(lang =>
      candidateLanguages.includes(lang)
    );
    scores.languages = (matchedLanguages.length / requiredLanguages.length) * 100;

    // Certifications matching
    if (requirements.certifications.length > 0) {
      const candidateCerts = parsedCV.certifications?.map(c => c.toLowerCase()) || [];
      const matchedCerts = requirements.certifications.filter(cert =>
        candidateCerts.some(cc => cc.includes(cert.toLowerCase()))
      );
      scores.certifications = (matchedCerts.length / requirements.certifications.length) * 100;
    } else {
      scores.certifications = 100; // No certifications required
    }

    // Calculate weighted total
    const weights = { skills: 0.4, experience: 0.3, languages: 0.2, certifications: 0.1 };
    const total = Object.keys(scores).reduce((sum, key) => sum + scores[key] * weights[key], 0);

    // Generate recommendation
    const recommendation = await this.generateMatchRecommendation(scores, total);

    return {
      total: Math.round(total),
      breakdown: scores,
      recommendation
    };
  }

  /**
   * Automated candidate screening
   */
  async screenCandidate(candidateData, position) {
    if (!this.config.autoScreening) {
      return { screened: false, message: 'Auto-screening disabled' };
    }

    this.emit('screening:started', { candidateId: candidateData.id, position });

    try {
      // Generate screening questions
      const questions = this.getScreeningQuestions(position);

      // Analyze responses (if provided)
      let responseAnalysis = null;
      if (candidateData.screeningResponses) {
        responseAnalysis = await this.analyzeScreeningResponses(
          candidateData.screeningResponses,
          position
        );
      }

      // Make screening decision
      const decision = await this.makeScreeningDecision(candidateData, position, responseAnalysis);

      const result = {
        success: true,
        candidateId: candidateData.id,
        position,
        questions,
        responseAnalysis,
        decision,
        screenedAt: new Date()
      };

      this.emit('screening:completed', { candidateId: candidateData.id, decision: decision.status });

      return result;
    } catch (error) {
      this.emit('screening:error', { candidateId: candidateData.id, error: error.message });
      throw error;
    }
  }

  /**
   * Rank candidates for a position
   */
  async rankCandidates(candidates, position) {
    const rankedCandidates = [];

    for (const candidate of candidates) {
      const score = await this.calculateCandidateScore(candidate, position);
      
      rankedCandidates.push({
        candidateId: candidate.id,
        name: candidate.name,
        score: score.total,
        breakdown: score.breakdown,
        recommendation: score.recommendation,
        status: candidate.status
      });
    }

    // Sort by total score
    rankedCandidates.sort((a, b) => b.score - a.score);

    return {
      position,
      totalCandidates: rankedCandidates.length,
      ranked: rankedCandidates,
      topCandidates: rankedCandidates.slice(0, 5),
      rankedAt: new Date()
    };
  }

  /**
   * Generate interview questions
   */
  async generateInterviewQuestions(candidateData, position) {
    const prompt = `Generate interview questions for this candidate:

Position: ${position}
Candidate Background:
- Experience: ${candidateData.experience?.length || 0} positions
- Skills: ${candidateData.skills?.join(', ') || 'none listed'}
- Education: ${candidateData.education?.map(e => e.degree).join(', ') || 'none listed'}

Generate:
1. 5 behavioral questions
2. 3 technical/skill-based questions
3. 2 situational questions specific to tourism industry
4. 1 cultural fit question

For each question, provide:
- The question
- What to look for in the answer
- Follow-up questions

Format as JSON array.`;

    const response = await this.ai.processRequest({
      prompt,
      model: this.config.model,
      temperature: 0.7,
      maxTokens: 1200
    });

    try {
      return JSON.parse(response.response);
    } catch (error) {
      return [];
    }
  }

  /**
   * Assess candidate interview performance
   */
  async assessInterview(candidateId, interviewNotes, interviewerFeedback) {
    const prompt = `Assess this interview performance:

Interview Notes:
${interviewNotes}

Interviewer Feedback:
${JSON.stringify(interviewerFeedback)}

Provide:
1. Overall performance rating (0-100)
2. Strengths demonstrated
3. Concerns or weaknesses
4. Cultural fit assessment
5. Hiring recommendation (strong hire/hire/maybe/no hire)
6. Next steps

Format as JSON.`;

    const response = await this.ai.processRequest({
      prompt,
      model: this.config.model,
      temperature: 0.4,
      maxTokens: 700
    });

    try {
      return JSON.parse(response.response);
    } catch (error) {
      return {
        rating: 50,
        strengths: [],
        concerns: [],
        culturalFit: 'unknown',
        recommendation: 'maybe',
        nextSteps: []
      };
    }
  }

  /**
   * Generate offer letter content
   */
  async generateOfferLetter(candidateData, position, terms) {
    const prompt = `Generate a professional offer letter:

Candidate: ${candidateData.name}
Position: ${position}
Terms:
- Start Date: ${terms.startDate}
- Salary: ${terms.salary}
- Benefits: ${terms.benefits?.join(', ') || 'standard package'}
- Work Schedule: ${terms.schedule || 'full-time'}

Include:
1. Warm welcome
2. Position details and responsibilities
3. Compensation and benefits
4. Start date and onboarding process
5. Acceptance deadline
6. Contact information

Professional tone, in Spanish (es).`;

    const response = await this.ai.processRequest({
      prompt,
      model: this.config.model,
      temperature: 0.6,
      maxTokens: 1000
    });

    return response.response;
  }

  /**
   * Helper: Calculate total experience
   */
  calculateTotalExperience(experiences) {
    if (!experiences || experiences.length === 0) return 0;

    let totalMonths = 0;
    for (const exp of experiences) {
      if (exp.duration) {
        // Parse duration (e.g., "2 years 3 months", "18 months", etc.)
        const years = exp.duration.match(/(\d+)\s*year/i);
        const months = exp.duration.match(/(\d+)\s*month/i);
        
        totalMonths += years ? parseInt(years[1]) * 12 : 0;
        totalMonths += months ? parseInt(months[1]) : 0;
      }
    }

    return Math.round(totalMonths / 12 * 10) / 10; // Round to 1 decimal
  }

  /**
   * Helper: Get screening questions
   */
  getScreeningQuestions(position) {
    const general = this.screeningQuestions.general;
    const specific = this.screeningQuestions.specific[position] || [];
    
    return [...general, ...specific];
  }

  /**
   * Helper: Analyze screening responses
   */
  async analyzeScreeningResponses(responses, position) {
    const prompt = `Analyze these screening responses for ${position} position:

${JSON.stringify(responses, null, 2)}

Evaluate:
1. Response quality (0-100)
2. Relevant experience demonstrated
3. Communication skills
4. Enthusiasm level
5. Red flags
6. Proceed to interview? (yes/no/maybe)

Format as JSON.`;

    const response = await this.ai.processRequest({
      prompt,
      model: this.config.model,
      temperature: 0.3,
      maxTokens: 500
    });

    try {
      return JSON.parse(response.response);
    } catch (error) {
      return {
        quality: 50,
        experience: 'unknown',
        communication: 50,
        enthusiasm: 50,
        redFlags: [],
        proceedToInterview: 'maybe'
      };
    }
  }

  /**
   * Helper: Make screening decision
   */
  async makeScreeningDecision(candidateData, position, responseAnalysis) {
    // Check minimum requirements
    const meetsMinimum = this.checkMinimumRequirements(candidateData, position);

    if (!meetsMinimum.passed) {
      return {
        status: 'rejected',
        reason: 'Does not meet minimum requirements',
        details: meetsMinimum.missing
      };
    }

    // If no responses yet, request them
    if (!responseAnalysis) {
      return {
        status: 'pending',
        reason: 'Awaiting screening responses',
        action: 'send_screening_questions'
      };
    }

    // Evaluate based on responses
    if (responseAnalysis.proceedToInterview === 'yes' && responseAnalysis.quality >= 70) {
      return {
        status: 'approved',
        reason: 'Strong candidate, proceed to interview',
        nextStep: 'schedule_interview'
      };
    }

    if (responseAnalysis.proceedToInterview === 'no' || responseAnalysis.quality < 40) {
      return {
        status: 'rejected',
        reason: 'Screening responses below threshold',
        details: responseAnalysis.redFlags
      };
    }

    return {
      status: 'review',
      reason: 'Requires manual review',
      action: 'hr_review'
    };
  }

  /**
   * Helper: Check minimum requirements
   */
  checkMinimumRequirements(candidateData, position) {
    const requirements = this.positions[position];
    if (!requirements) {
      return { passed: false, missing: ['Invalid position'] };
    }

    const missing = [];

    // Check experience
    const totalYears = this.calculateTotalExperience(candidateData.experience);
    if (totalYears < requirements.experience) {
      missing.push(`Minimum ${requirements.experience} years experience required`);
    }

    // Check languages
    const candidateLanguages = candidateData.languages?.map(l => l.language.toLowerCase()) || [];
    const hasRequiredLanguages = requirements.languages.every(lang =>
      candidateLanguages.includes(lang.toLowerCase())
    );
    if (!hasRequiredLanguages) {
      missing.push(`Required languages: ${requirements.languages.join(', ')}`);
    }

    return {
      passed: missing.length === 0,
      missing
    };
  }

  /**
   * Helper: Generate match recommendation
   */
  async generateMatchRecommendation(scores, totalScore) {
    if (totalScore >= 90) {
      return 'Excellent match - Highly recommended for immediate interview';
    }
    if (totalScore >= 80) {
      return 'Strong match - Recommended for interview';
    }
    if (totalScore >= 70) {
      return 'Good match - Consider for interview';
    }
    if (totalScore >= 60) {
      return 'Moderate match - May require additional screening';
    }
    return 'Weak match - Not recommended unless exceptional circumstances';
  }

  /**
   * Helper: Calculate candidate score
   */
  async calculateCandidateScore(candidate, position) {
    const scores = {
      cv_quality: candidate.cvAnalysis?.completeness || 0,
      position_match: candidate.positionMatch?.score || 0,
      screening: candidate.screeningAnalysis?.quality || 0,
      interview: candidate.interviewAssessment?.rating || 0
    };

    // Weighted average
    const weights = { cv_quality: 0.2, position_match: 0.3, screening: 0.2, interview: 0.3 };
    const total = Object.keys(scores).reduce((sum, key) => sum + scores[key] * weights[key], 0);

    const recommendation = await this.generateMatchRecommendation(scores, total);

    return {
      total: Math.round(total),
      breakdown: scores,
      recommendation
    };
  }

  /**
   * Get recruitment statistics
   */
  async getRecruitmentStats(startDate, endDate) {
    return {
      period: { startDate, endDate },
      totalApplications: 0,
      byPosition: {},
      byStatus: {
        pending: 0,
        screening: 0,
        interview: 0,
        approved: 0,
        rejected: 0
      },
      averageTimeToHire: 0, // days
      topSources: [],
      conversionRates: {
        applicationToScreening: 0,
        screeningToInterview: 0,
        interviewToOffer: 0
      }
    };
  }
}

module.exports = HRRecruitmentAgent;
