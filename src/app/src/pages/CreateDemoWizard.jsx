import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check, Palette, MapPin, Settings, Upload, X, Target, Bot, Info, Eye, Sparkles, Building2, LayoutGrid } from 'lucide-react'

/**
 * CreateDemoWizard - Simplified 3-step form for creating retail intelligence demos
 * 
 * New Flow:
 * 1. Brand Customization - Direct input (name, vertical, colors, logo)
 * 2. Store Distribution - Footprint selection + store count slider
 * 3. Metrics & Categories - Preset loading + customization
 */
export default function CreateDemoWizard() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0) // Start at Step 0
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [verticalPresets, setVerticalPresets] = useState(null)
  
  // LLM generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingAgent, setIsGeneratingAgent] = useState(false)
  const [generationError, setGenerationError] = useState(null)
  const [agentPromptError, setAgentPromptError] = useState(null)
  const [agentPrompt, setAgentPrompt] = useState('')
  
  // Form data state
  const [formData, setFormData] = useState({
    // Step 0: Demo Type (NEW)
    demoType: 'generic', // 'generic' or 'specific'
    retailerName: '',
    isLlmGenerated: false,
    llmGeneratedConfig: null,
    businessChallenges: [],
    country: 'US', // 'US', 'CA', or 'FR'

    // Step 1: Brand
    demoName: '',
    displayName: '',
    vertical: 'pharmacy', // pharmacy, grocery, sporting_goods, general_retail
    primaryColor: '#EC0000',
    secondaryColor: '#003d7a',
    logoType: 'text', // 'text' or 'image'
    logoText: '',
    logoFile: null,
    logoPreview: null,
    
    // Step 2: Distribution
    footprintType: 'nationwide', // nationwide, east_coast, west_coast, central, south, northeast
    storeCount: 1500,
    
    // Step 3: Metrics (loaded from preset)
    primaryMetric: {
      displayName: 'Store Performance',
      targets: { optimal: 93, attention: 92, priority: 90 }
    },
    secondaryMetric: {
      displayName: 'Days of Supply',
      target: 60
    },
    categories: [
      { id: 'category_1', displayName: 'Category 1', dosTarget: 45, ssisTarget: 90, priority: 'high', seasonality: 'medium' },
      { id: 'category_2', displayName: 'Category 2', dosTarget: 60, ssisTarget: 90, priority: 'high', seasonality: 'medium' },
      { id: 'category_3', displayName: 'Category 3', dosTarget: 45, ssisTarget: 85, priority: 'medium', seasonality: 'low' },
      { id: 'category_4', displayName: 'Category 4', dosTarget: 60, ssisTarget: 85, priority: 'medium', seasonality: 'low' },
      { id: 'category_5', displayName: 'Category 5', dosTarget: 90, ssisTarget: 80, priority: 'low', seasonality: 'low' },
    ]
    
    // Step 4: Agent prompt will be stored in agentPrompt state variable
  })
  
  const [errors, setErrors] = useState({})

  // Load vertical presets on mount
  useEffect(() => {
    fetch('/config/vertical-presets.json')
      .then(res => res.json())
      .then(data => {
        setVerticalPresets(data)
        // Auto-load default preset
        loadPreset('pharmacy', data)
      })
      .catch(err => console.error('Failed to load vertical presets:', err))
  }, [])

  // Auto-load preset when vertical changes
  useEffect(() => {
    if (verticalPresets && formData.vertical) {
      loadPreset(formData.vertical, verticalPresets)
    }
  }, [formData.vertical])

  const allFootprints = [
    // US footprints
    {
      id: 'nationwide',
      name: 'Nationwide',
      description: 'All US states, coast to coast',
      states: 'All 50 states',
      maxStores: 5000,
      country: 'US'
    },
    {
      id: 'east_coast',
      name: 'East Coast',
      description: 'Eastern seaboard states',
      states: 'NY, NJ, PA, MA, CT, MD, VA, NC, SC, FL',
      maxStores: 5000,
      country: 'US'
    },
    {
      id: 'west_coast',
      name: 'West Coast',
      description: 'Pacific and Southwest',
      states: 'CA, OR, WA, NV, AZ',
      maxStores: 5000,
      country: 'US'
    },
    {
      id: 'central',
      name: 'Central',
      description: 'Midwest and Great Lakes',
      states: 'IL, IN, OH, MI, WI, MN, IA, MO, KS, NE',
      maxStores: 5000,
      country: 'US'
    },
    {
      id: 'south',
      name: 'South',
      description: 'Southern states',
      states: 'TX, LA, AR, OK, TN, AL, MS, GA, FL',
      maxStores: 5000,
      country: 'US'
    },
    {
      id: 'northeast',
      name: 'Northeast',
      description: 'New England and Mid-Atlantic',
      states: 'NY, PA, NJ, MA, CT, NH, VT, ME, RI',
      maxStores: 5000,
      country: 'US'
    },
    // France footprints
    {
      id: 'france_nationwide',
      name: 'France - Nationwide',
      description: 'All French regions, from Paris to the Côte d\'Azur',
      states: 'All 13 metropolitan regions',
      maxStores: 5000,
      country: 'FR'
    },
    {
      id: 'france_ile_de_france',
      name: 'Île-de-France',
      description: 'Paris and surrounding area',
      states: 'Paris, Hauts-de-Seine, Seine-Saint-Denis, Val-de-Marne',
      maxStores: 3000,
      country: 'FR'
    },
    {
      id: 'france_nord',
      name: 'Nord',
      description: 'Hauts-de-France, Normandie, Bretagne',
      states: 'Hauts-de-France, Normandie, Bretagne',
      maxStores: 3000,
      country: 'FR'
    },
    {
      id: 'france_sud',
      name: 'Sud',
      description: 'PACA, Occitanie, Corse',
      states: 'PACA, Occitanie, Corse',
      maxStores: 3000,
      country: 'FR'
    },
    {
      id: 'france_ouest',
      name: 'Ouest',
      description: 'Pays de la Loire, Nouvelle-Aquitaine',
      states: 'Pays de la Loire, Nouvelle-Aquitaine',
      maxStores: 3000,
      country: 'FR'
    },
    {
      id: 'france_est',
      name: 'Est',
      description: 'Grand Est, Bourgogne-Franche-Comté, Auvergne-Rhône-Alpes',
      states: 'Grand Est, Bourgogne-Franche-Comté, Auvergne-Rhône-Alpes',
      maxStores: 3000,
      country: 'FR'
    }
  ]

  // Filter footprints by selected country
  const footprints = allFootprints.filter(f => f.country === formData.country)

  const steps = [
    { number: 0, title: 'Type', icon: Target, description: 'Generic or Specific' },
    { number: 1, title: 'Brand', icon: Building2, description: 'Customize branding' },
    { number: 2, title: 'Distribution', icon: LayoutGrid, description: 'Select footprint' },
    { number: 3, title: 'Metrics', icon: Sparkles, description: 'Configure metrics' },
    { number: 4, title: 'Agent', icon: Bot, description: 'Configure AI agent' },
    { number: 5, title: 'Review', icon: Eye, description: 'Review and create' },
  ]

  const loadPreset = (vertical, presets = verticalPresets) => {
    if (!presets || !presets[vertical]) return
    
    const preset = presets[vertical]
    
    setFormData(prev => ({
      ...prev,
      primaryMetric: {
        displayName: preset.metrics.primaryKPI.displayName,
        targets: preset.metrics.primaryKPI.targets
      },
      secondaryMetric: {
        displayName: preset.metrics.secondaryKPI.displayName,
        target: preset.metrics.secondaryKPI.target
      },
      categories: preset.categories.map((cat, idx) => ({
        id: `category_${idx + 1}`,
        displayName: cat.displayName,
        dosTarget: cat.dosTarget,
        ssisTarget: cat.ssisTarget,
        priority: cat.priority,
        seasonality: cat.seasonality
      }))
    }))
  }

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const updateMetric = (metric, field, value) => {
    setFormData(prev => ({
      ...prev,
      [metric]: {
        ...prev[metric],
        [field]: value
      }
    }))
  }

  const updateMetricTarget = (target, value) => {
    setFormData(prev => ({
      ...prev,
      primaryMetric: {
        ...prev.primaryMetric,
        targets: {
          ...prev.primaryMetric.targets,
          [target]: parseInt(value) || 0
        }
      }
    }))
  }

  const updateCategory = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.map((cat, idx) => 
        idx === index ? { ...cat, [field]: value } : cat
      )
    }))
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      updateFormData('logoFile', file)
      updateFormData('logoPreview', URL.createObjectURL(file))
    }
  }

  const clearLogo = () => {
    updateFormData('logoFile', null)
    updateFormData('logoPreview', null)
  }

  // Helper: Normalize vertical values from LLM
  const normalizeVertical = (vertical) => {
    const normalized = vertical.toLowerCase().trim();
    
    // Map common variations to our supported verticals
    if (normalized.includes('pharmacy') || normalized.includes('drugstore') || normalized.includes('health')) {
      return 'pharmacy';
    }
    if (normalized.includes('grocery') || normalized.includes('supermarket') || normalized.includes('food')) {
      return 'grocery';
    }
    if (normalized.includes('sport') || normalized.includes('athletic') || normalized.includes('outdoor')) {
      return 'sporting_goods';
    }
    if (normalized.includes('beauty') || normalized.includes('cosmetic') || normalized.includes('makeup')) {
      return 'beauty';
    }
    if (normalized.includes('apparel') || normalized.includes('fashion') || normalized.includes('clothing')) {
      return 'apparel';
    }
    
    // Default to general_retail
    return 'general_retail';
  };

  // STEP 1 LLM: Generate config from retailer name
  const generatePersonalization = async () => {
    if (!formData.retailerName || formData.retailerName.trim().length < 2) {
      setErrors({ retailerName: 'Please enter a retailer name' })
      return false
    }

    setIsGenerating(true)
    setGenerationError(null)

    try {
      console.log(`🤖 Step 1: Generating config for: ${formData.retailerName}`)
      
      const response = await fetch('/api/personalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retailerName: formData.retailerName })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Config generation failed')
      }

      console.log('✅ Generated config:', result.config)

      // Normalize the vertical value
      const normalizedVertical = normalizeVertical(result.config.vertical);
      console.log(`📊 Vertical: "${result.config.vertical}" → "${normalizedVertical}"`);

      // Store config in formData
      setFormData(prev => ({
        ...prev,
        isLlmGenerated: true,
        llmGeneratedConfig: result.config,
        displayName: result.config.display_name || prev.retailerName,
        demoName: (result.config.display_name || prev.retailerName).toLowerCase().replace(/\s+/g, '-'),
        vertical: normalizedVertical,
        businessChallenges: result.config.business_challenges,
        primaryMetric: {
          displayName: result.config.primary_kpi.display_name,
          targets: result.config.primary_kpi.targets
        },
        secondaryMetric: {
          displayName: result.config.secondary_kpi.display_name,
          target: result.config.secondary_kpi.target
        },
        categories: result.config.categories.map((cat, idx) => ({
          id: cat.id || `category_${idx + 1}`,
          displayName: cat.display_name,
          dosTarget: cat.dos_target,
          ssisTarget: cat.performance_target || 90,
          priority: cat.priority,
          seasonality: cat.seasonality || 'medium'
        }))
      }))

      console.log('✅ Step 1 complete for', formData.retailerName, ':', {
        vertical: result.config.vertical,
        categories: result.config.categories?.length || 0,
        challenges: result.config.business_challenges?.length || 0,
        brandColors: result.config.brand_colors ? 'provided' : 'not provided'
      });

      // If brand colors provided, update form data
      if (result.config.brand_colors) {
        console.log('🎨 Setting brand colors:', result.config.brand_colors);
        setFormData(prev => ({
          ...prev,
          primaryColor: result.config.brand_colors.primary || prev.primaryColor,
          secondaryColor: result.config.brand_colors.secondary || prev.secondaryColor
        }));
      }

      return true

    } catch (error) {
      console.error('❌ Config generation error:', error)
      setGenerationError(error.message)
      return false
    } finally {
      setIsGenerating(false)
    }
  }

  // STEP 2 LLM: Generate agent prompt
  const generateAgentPrompt = async () => {
    setIsGeneratingAgent(true)
    setAgentPromptError(null)

    try {
      console.log(`🤖 Step 2: Generating agent prompt for: ${formData.displayName}`)
      
      const response = await fetch('/api/generate-agent-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailerName: formData.retailerName || formData.displayName,
          vertical: formData.vertical,
          primary_kpi: formData.primaryMetric,
          secondary_kpi: formData.secondaryMetric,
          categories: formData.categories,
          business_challenges: formData.businessChallenges,
          isGeneric: formData.demoType === 'generic'
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Agent prompt generation failed')
      }

      console.log(`✅ Agent prompt generated (${result.prompt.length} chars)`)
      setAgentPrompt(result.prompt)
      return true

    } catch (error) {
      console.error('❌ Agent prompt generation error:', error)
      setAgentPromptError(error.message)
      return false
    } finally {
      setIsGeneratingAgent(false)
    }
  }

  const validateStep = (step) => {
    const newErrors = {}
    
    switch (step) {
      case 1:
        if (!formData.demoName || formData.demoName.length < 2) {
          newErrors.demoName = 'Demo name must be at least 2 characters'
        }
        if (!formData.vertical) {
          newErrors.vertical = 'Please select a vertical'
        }
        break
      case 2:
        if (!formData.footprintType) {
          newErrors.footprintType = 'Please select a footprint'
        }
        if (formData.storeCount < 1 || formData.storeCount > 5000) {
          newErrors.storeCount = 'Store count must be between 1 and 5000'
        }
        break
      case 3:
        if (!formData.primaryMetric.displayName) {
          newErrors.primaryMetric = 'Primary metric name required'
        }
        break
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = async () => {
    if (!validateStep(currentStep)) {
      return
    }

    // Step 0: Generate config if Specific retailer
    if (currentStep === 0) {
      if (formData.demoType === 'specific') {
        const success = await generatePersonalization()
        if (!success) return // Stay on Step 0 if generation fails
      }
      setCurrentStep(1)
      return
    }
    
    // Step 3 → 4: Generate agent prompt
    if (currentStep === 3) {
      const success = await generateAgentPrompt()
      if (!success) return // Stay on Step 3 if generation fails
      setCurrentStep(4)
      return
    }

    // Normal navigation
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      // Build demo payload (logo will be uploaded AFTER demo creation)
      const payload = {
        demo_name: formData.demoName,
        is_public: true,  // All demos are public
        isLlmGenerated: formData.isLlmGenerated,
        agentPrompt: agentPrompt, // From Step 4
        
        branding: {
          display_name: formData.displayName || formData.demoName,
          tagline: null,
          vertical: formData.vertical,
          logo_type: formData.logoType,
          logo_text: formData.logoType === 'text' ? (formData.logoText || formData.demoName) : null,
          logo_path: null, // Will be updated after upload
          primary_color: formData.primaryColor,
          secondary_color: formData.secondaryColor,
          accent_color: null
        },
        
        store_data: {
          data_source: 'synthetic',
          footprint_type: formData.footprintType,
          store_count: formData.storeCount,
          vertical: formData.vertical,
          country: formData.country,
          table_name: null,
          geography_json: null
        },
        
        metrics: {
          primary_kpi: {
            name: formData.primaryMetric.displayName.toLowerCase().replace(/\s+/g, '_'),
            display_name: formData.primaryMetric.displayName,
            targets: formData.primaryMetric.targets
          },
          secondary_kpi: {
            name: formData.secondaryMetric.displayName.toLowerCase().replace(/\s+/g, '_'),
            display_name: formData.secondaryMetric.displayName,
            target: formData.secondaryMetric.target
          },
          categories: formData.categories
        },
        
        agent_config: {
          system_prompt: agentPrompt,
          temperature: 0.7,
          max_tokens: 2000,
          model_endpoint: 'databricks-meta-llama-3-3-70b-instruct'
        }
      }
      
      console.log('Creating demo with payload:', payload)
      
      const response = await fetch('/api/demos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create demo')
      }
      
      const demo = await response.json()
      console.log('✅ Demo created successfully:', demo)
      
      // Upload logo if provided (must happen AFTER demo creation)
      if (formData.logoFile) {
        console.log('📤 Uploading logo for demo:', demo.demo_id)
        console.log('📄 Logo file details:', {
          name: formData.logoFile.name,
          type: formData.logoFile.type,
          size: formData.logoFile.size
        })
        
        const logoFormData = new FormData()
        logoFormData.append('logo', formData.logoFile)
        
        const logoUploadUrl = `/api/demos/${demo.demo_id}/logo`
        console.log('🔗 Logo upload URL:', logoUploadUrl)
        
        try {
          const logoResponse = await fetch(logoUploadUrl, {
            method: 'POST',
            body: logoFormData
          })
          
          console.log('📡 Logo upload response status:', logoResponse.status)
          
          if (!logoResponse.ok) {
            const errorText = await logoResponse.text()
            console.error('❌ Logo upload failed:', errorText)
            // Don't throw - logo upload is non-critical
            console.warn('⚠️ Continuing without logo upload')
          } else {
            const logoData = await logoResponse.json()
            console.log('✅ Logo uploaded successfully:', logoData)
          }
        } catch (logoError) {
          console.error('❌ Logo upload error:', logoError)
          // Don't throw - logo upload is non-critical
          console.warn('⚠️ Continuing without logo upload')
        }
      }
      
      navigate('/') // Navigate to home/demo list
    } catch (error) {
      console.error('Error creating demo:', error)
      setErrors({ submit: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Auto-populate display name from demo name
  useEffect(() => {
    if (formData.demoName && !formData.displayName) {
      updateFormData('displayName', formData.demoName)
    }
  }, [formData.demoName])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Demo</h1>
              <p className="text-sm text-gray-500 mt-1">
                Configure your retail intelligence demo in 3 simple steps
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex items-center">
                  <div
                    className={`
                      flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                      ${currentStep > step.number
                        ? 'bg-green-500 border-green-500 text-white'
                        : currentStep === step.number
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                      }
                    `}
                  >
                    {currentStep > step.number ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="ml-3">
                    <div className={`text-sm font-medium ${currentStep >= step.number ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500">{step.description}</div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Step 0: Demo Type Selection */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Demo Type</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Would you like a generic industry demo or one customized for a specific retailer?
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Generic Option */}
                <label className={`relative block cursor-pointer rounded-lg border-2 p-6 shadow-sm transition-all ${
                  formData.demoType === 'generic' ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="demoType"
                    value="generic"
                    checked={formData.demoType === 'generic'}
                    onChange={(e) => updateFormData('demoType', e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-start space-x-4">
                    <LayoutGrid className="h-8 w-8 text-blue-600 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Generic Industry</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Choose from pre-built templates (Pharmacy, Grocery, Sporting Goods, etc.)
                      </p>
                      <p className="text-xs text-gray-500 mt-2">Best for: Quick demos, POCs, industry showcases</p>
                    </div>
                  </div>
                  {formData.demoType === 'generic' && (
                    <Check className="absolute top-4 right-4 h-5 w-5 text-blue-600" />
                  )}
                </label>

                {/* Specific Retailer Option */}
                <label className={`relative block cursor-pointer rounded-lg border-2 p-6 shadow-sm transition-all ${
                  formData.demoType === 'specific' ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="demoType"
                    value="specific"
                    checked={formData.demoType === 'specific'}
                    onChange={(e) => updateFormData('demoType', e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-start space-x-4">
                    <Sparkles className="h-8 w-8 text-purple-600 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Specific Retailer</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        AI-powered personalization for any retailer (Kroger, Nike, Ulta, etc.)
                      </p>
                      <p className="text-xs text-gray-500 mt-2">Best for: Customer demos, tailored presentations</p>
                    </div>
                  </div>
                  {formData.demoType === 'specific' && (
                    <Check className="absolute top-4 right-4 h-5 w-5 text-blue-600" />
                  )}
                </label>
              </div>

              {/* Country / Geography Selector */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Country / Geography
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'US', name: 'United States', flag: 'US', desc: 'US retail footprints' },
                    { id: 'CA', name: 'Canada', flag: 'CA', desc: 'Canadian retail footprints' },
                    { id: 'FR', name: 'France', flag: 'FR', desc: 'French/European retail footprints' }
                  ].map(country => (
                    <div
                      key={country.id}
                      onClick={() => {
                        updateFormData('country', country.id)
                        // Reset footprint when country changes
                        const defaultFootprints = { US: 'nationwide', CA: 'canada_nationwide', FR: 'france_nationwide' }
                        updateFormData('footprintType', defaultFootprints[country.id] || 'nationwide')
                      }}
                      className={`
                        p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md text-center
                        ${formData.country === country.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-400'
                        }
                      `}
                    >
                      <h3 className="text-base font-semibold text-gray-900">{country.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{country.desc}</p>
                      {formData.country === country.id && (
                        <Check className="w-4 h-4 text-blue-500 mx-auto mt-2" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Retailer Name Input (show if Specific selected) */}
              {formData.demoType === 'specific' && (
                <div className="mt-6 p-6 bg-purple-50 rounded-lg border border-purple-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Retailer Name *
                  </label>
                  <input
                    type="text"
                    value={formData.retailerName}
                    onChange={(e) => updateFormData('retailerName', e.target.value)}
                    placeholder="Enter retailer name (e.g., Kroger, Nike, Ulta)"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                      errors.retailerName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Our AI will analyze this retailer and generate customized metrics, categories, and insights.
                  </p>
                  {errors.retailerName && (
                    <p className="text-sm text-red-600 mt-1">{errors.retailerName}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 1: Brand Customization */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Brand Customization</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Set up your demo's branding and identity
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={formData.demoName}
                    onChange={(e) => updateFormData('demoName', e.target.value)}
                    placeholder="e.g., Acme Retail"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.demoName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.demoName && (
                    <p className="text-sm text-red-600 mt-1">{errors.demoName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => updateFormData('displayName', e.target.value)}
                    placeholder="Auto-populated from customer name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retail Vertical *
                  {formData.isLlmGenerated && (
                    <span className="ml-2 text-xs text-purple-600 font-normal">
                      (AI-identified)
                    </span>
                  )}
                </label>
                
                {formData.isLlmGenerated ? (
                  // Read-only display for LLM-generated vertical
                  <div className="w-full px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-gray-900">
                    {formData.vertical === 'pharmacy' && '🏥 Pharmacy / Drugstore'}
                    {formData.vertical === 'grocery' && '🛒 Grocery / Supermarket'}
                    {formData.vertical === 'sporting_goods' && '⚽ Sporting Goods'}
                    {formData.vertical === 'beauty' && '💄 Beauty & Cosmetics'}
                    {formData.vertical === 'apparel' && '👕 Apparel / Fashion'}
                    {formData.vertical === 'general_retail' && '🏬 General Retail'}
                    {!['pharmacy', 'grocery', 'sporting_goods', 'beauty', 'apparel', 'general_retail'].includes(formData.vertical) && `🏪 ${formData.vertical}`}
                  </div>
                ) : (
                  // Editable dropdown for manual selection
                  <select
                    value={formData.vertical}
                    onChange={(e) => updateFormData('vertical', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pharmacy">Pharmacy / Drugstore</option>
                    <option value="grocery">Grocery / Supermarket</option>
                    <option value="sporting_goods">Sporting Goods</option>
                    <option value="beauty">Beauty & Cosmetics</option>
                    <option value="apparel">Apparel / Fashion</option>
                    <option value="general_retail">General Retail</option>
                  </select>
                )}
                
                <p className="text-xs text-gray-500 mt-1">
                  {formData.isLlmGenerated 
                    ? 'AI automatically identified this vertical based on your retailer'
                    : 'Selecting a vertical will pre-load appropriate metrics and categories'
                  }
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => updateFormData('primaryColor', e.target.value)}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) => updateFormData('primaryColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secondary Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) => updateFormData('secondaryColor', e.target.value)}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.secondaryColor}
                      onChange={(e) => updateFormData('secondaryColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo
                </label>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="text"
                        checked={formData.logoType === 'text'}
                        onChange={(e) => updateFormData('logoType', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-sm">Text Logo</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="image"
                        checked={formData.logoType === 'image'}
                        onChange={(e) => updateFormData('logoType', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-sm">Image Upload</span>
                    </label>
                  </div>

                  {formData.logoType === 'text' ? (
                    <input
                      type="text"
                      value={formData.logoText}
                      onChange={(e) => updateFormData('logoText', e.target.value)}
                      placeholder={formData.demoName || 'Enter logo text'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  ) : (
                    <div className="space-y-3">
                      {formData.logoPreview ? (
                        <div className="flex items-center space-x-4">
                          <img
                            src={formData.logoPreview}
                            alt="Logo preview"
                            className="h-16 w-16 object-contain border border-gray-200 rounded"
                          />
                          <button
                            onClick={clearLogo}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                            id="logo-upload"
                          />
                          <label
                            htmlFor="logo-upload"
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Logo
                          </label>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>
            </div>
          )}

          {/* Step 2: Store Distribution - Will continue in next file due to length */}
          {currentStep === 2 && (
            <StepTwoDistribution
              formData={formData}
              updateFormData={updateFormData}
              footprints={footprints}
              errors={errors}
            />
          )}

          {/* Step 3: Metrics & Categories */}
          {currentStep === 3 && (
            <StepThreeMetrics
              formData={formData}
              updateMetric={updateMetric}
              updateMetricTarget={updateMetricTarget}
              updateCategory={updateCategory}
              errors={errors}
            />
          )}

          {/* Step 4: AI Agent Configuration */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Agent Configuration</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Review and customize the AI agent prompt for {formData.displayName || 'your demo'}. 
                  This prompt defines how the agent will analyze stores and provide recommendations.
                </p>
              </div>

              {/* Agent Prompt Editor */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-5 w-5 text-purple-600" />
                      <h3 className="font-semibold text-gray-900">Agent System Prompt</h3>
                    </div>
                    <span className="text-sm text-gray-500">
                      {agentPrompt.length} characters
                    </span>
                  </div>
                </div>
                
                <textarea
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  className="w-full p-4 font-mono text-sm border-0 focus:ring-0 min-h-[400px]"
                  placeholder="Agent prompt will appear here..."
                />
              </div>

              {/* Helper Text */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-700">
                    <p className="font-medium text-blue-900 mb-1">Editing Tips:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>This prompt is generated based on your selected vertical and metrics</li>
                      <li>You can edit it to add retailer-specific terminology or priorities</li>
                      <li>The agent will use this prompt to analyze store performance and make recommendations</li>
                      <li>Changes are saved when you complete the wizard</li>
                    </ul>
                  </div>
                </div>
              </div>

              {agentPromptError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 font-medium">Generation Error</p>
                  <p className="text-red-600 text-sm mt-1">{agentPromptError}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Review & Create */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Review & Create</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Review your demo configuration before creating
                </p>
              </div>

              {/* Summary Cards */}
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Brand</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-600">Name:</span> {formData.displayName || formData.demoName}</div>
                    <div><span className="text-gray-600">Vertical:</span> {formData.vertical}</div>
                    <div><span className="text-gray-600">Primary Color:</span> <span style={{color: formData.primaryColor}}>{formData.primaryColor}</span></div>
                    <div><span className="text-gray-600">Logo:</span> {formData.logoType === 'image' ? 'Custom Image' : 'Text'}</div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Distribution</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-600">Country:</span> {formData.country === 'FR' ? 'France' : formData.country === 'CA' ? 'Canada' : 'United States'}</div>
                    <div><span className="text-gray-600">Footprint:</span> {allFootprints.find(f => f.id === formData.footprintType)?.name}</div>
                    <div><span className="text-gray-600">Store Count:</span> {formData.storeCount.toLocaleString()}</div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Metrics</h3>
                  <div className="text-sm space-y-1">
                    <div><span className="text-gray-600">Primary KPI:</span> {formData.primaryMetric.displayName}</div>
                    <div><span className="text-gray-600">Secondary KPI:</span> {formData.secondaryMetric.displayName}</div>
                    <div><span className="text-gray-600">Categories:</span> {formData.categories.length} configured</div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">AI Agent</h3>
                  <div className="text-sm space-y-1">
                    <div><span className="text-gray-600">Prompt Length:</span> {agentPrompt.length} characters</div>
                    <div><span className="text-gray-600">Type:</span> {formData.isLlmGenerated ? 'LLM Generated' : 'Template Based'}</div>
                  </div>
                </div>
              </div>

              {errors.submit && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 font-medium">Error Creating Demo</p>
                  <p className="text-red-600 text-sm mt-1">{errors.submit}</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className={`
                flex items-center px-4 py-2 rounded-lg font-medium transition-colors
                ${currentStep === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </button>

            <div className="text-sm text-gray-500">
              Step {currentStep + 1} of {steps.length}
            </div>

            <button
              onClick={handleNext}
              disabled={isSubmitting || isGenerating || isGeneratingAgent}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                'Creating...'
              ) : isGenerating ? (
                'Generating Config...'
              ) : isGeneratingAgent ? (
                'Generating Agent...'
              ) : currentStep === steps.length - 1 ? (
                'Create Demo'
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>

          {errors.submit && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}
        </div>
      </div>

      {/* Config Generation Overlay (Step 0 → 1) */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Researching {formData.retailerName}...
            </h3>
            <p className="text-gray-600">
              Our AI is analyzing this retailer and generating customized metrics, categories, and insights.
            </p>
            <p className="text-sm text-gray-500 mt-4">This usually takes 5-10 seconds</p>
          </div>
        </div>
      )}

      {/* Agent Generation Overlay (Step 3 → 4) */}
      {isGeneratingAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Generating an agent for {formData.displayName}...
            </h3>
            <p className="text-gray-600">
              Our AI is creating a custom agent prompt tailored to {formData.vertical} retail operations.
            </p>
            <p className="text-sm text-gray-500 mt-4">This usually takes 5-10 seconds</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {generationError && (
        <div className="fixed bottom-4 right-4 max-w-md bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg z-50">
          <p className="text-red-700 font-medium">Personalization Error</p>
          <p className="text-red-600 text-sm mt-1">{generationError}</p>
          <button
            onClick={() => {
              setFormData(prev => ({ ...prev, demoType: 'generic' }))
              setGenerationError(null)
            }}
            className="mt-2 text-sm text-red-700 underline"
          >
            Fall back to generic templates
          </button>
        </div>
      )}
    </div>
  )
}

// Step 2: Store Distribution Component
function StepTwoDistribution({ formData, updateFormData, footprints, errors }) {
  const selectedFootprint = footprints.find(f => f.id === formData.footprintType)
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Store Distribution</h2>
        <p className="text-sm text-gray-600 mb-6">
          Select a geographic footprint and specify the number of stores for your demo
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Geographic Footprint *
        </label>
        <div className="grid grid-cols-2 gap-4">
          {footprints.map(footprint => (
            <div
              key={footprint.id}
              onClick={() => updateFormData('footprintType', footprint.id)}
              className={`
                p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md
                ${formData.footprintType === footprint.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-400'
                }
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold text-gray-900">{footprint.name}</h3>
                {formData.footprintType === footprint.id && (
                  <Check className="w-5 h-5 text-blue-500" />
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">{footprint.description}</p>
              <p className="text-xs text-gray-500">{footprint.states}</p>
              <p className="text-xs text-gray-500 mt-1">
                Max: {footprint.maxStores.toLocaleString()} stores
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            Number of Stores *
          </label>
          <span className="text-lg font-semibold text-blue-600">
            {formData.storeCount.toLocaleString()}
          </span>
        </div>
        <input
          type="range"
          min="100"
          max="9000"
          step="100"
          value={formData.storeCount}
          onChange={(e) => updateFormData('storeCount', parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>100</span>
          <span>9,000</span>
        </div>
      </div>

      {selectedFootprint && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            Your demo will have <strong>{formData.storeCount.toLocaleString()}</strong> stores
            in the <strong>{selectedFootprint.name}</strong> region
            ({selectedFootprint.states}).
          </p>
        </div>
      )}
    </div>
  )
}

// Step 3: Metrics & Categories Component
function StepThreeMetrics({ formData, updateMetric, updateMetricTarget, updateCategory, errors }) {
  const [expandedCategories, setExpandedCategories] = useState([0])

  const toggleCategory = (index) => {
    setExpandedCategories(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Metrics & Categories</h2>
        <p className="text-sm text-gray-600 mb-6">
          Customize performance metrics and product categories (pre-loaded from {formData.vertical} preset)
        </p>
      </div>

      {/* Primary Metric */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Primary KPI (Performance Score)</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={formData.primaryMetric.displayName}
              onChange={(e) => updateMetric('primaryMetric', 'displayName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Optimal (%)
              </label>
              <input
                type="number"
                value={formData.primaryMetric.targets.optimal}
                onChange={(e) => updateMetricTarget('optimal', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attention (%)
              </label>
              <input
                type="number"
                value={formData.primaryMetric.targets.attention}
                onChange={(e) => updateMetricTarget('attention', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority (%)
              </label>
              <input
                type="number"
                value={formData.primaryMetric.targets.priority}
                onChange={(e) => updateMetricTarget('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metric */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Secondary KPI (Inventory)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={formData.secondaryMetric.displayName}
              onChange={(e) => updateMetric('secondaryMetric', 'displayName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target
            </label>
            <input
              type="number"
              value={formData.secondaryMetric.target}
              onChange={(e) => updateMetric('secondaryMetric', 'target', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-3">Product Categories</h3>
        <div className="space-y-3">
          {formData.categories.map((category, index) => (
            <div key={category.id} className="border border-gray-200 rounded-lg">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleCategory(index)}
              >
                <input
                  type="text"
                  value={category.displayName}
                  onChange={(e) => {
                    e.stopPropagation()
                    updateCategory(index, 'displayName', e.target.value)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-medium"
                />
                <ChevronRight
                  className={`w-5 h-5 ml-3 text-gray-400 transition-transform ${
                    expandedCategories.includes(index) ? 'rotate-90' : ''
                  }`}
                />
              </div>
              {expandedCategories.includes(index) && (
                <div className="p-4 pt-0 border-t border-gray-200 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      DOS Target (days)
                    </label>
                    <input
                      type="number"
                      value={category.dosTarget}
                      onChange={(e) => updateCategory(index, 'dosTarget', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Performance Target (%)
                    </label>
                    <input
                      type="number"
                      value={category.ssisTarget}
                      onChange={(e) => updateCategory(index, 'ssisTarget', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={category.priority}
                      onChange={(e) => updateCategory(index, 'priority', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seasonality
                    </label>
                    <select
                      value={category.seasonality}
                      onChange={(e) => updateCategory(index, 'seasonality', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Configuration Summary</h4>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>• Primary Metric: {formData.primaryMetric.displayName}</li>
          <li>• Secondary Metric: {formData.secondaryMetric.displayName}</li>
          <li>• Categories: {formData.categories.map(c => c.displayName).join(', ')}</li>
        </ul>
      </div>
    </div>
  )
}

