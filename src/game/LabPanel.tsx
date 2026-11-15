
import { useState } from 'react';
import {
  CHEMISTRY_ERROR_MESSAGES,
  type AnalysisResult,
  type ChemistryBridge,
  type ResearchSample,
} from './chemistry/ChemistrySystem';

interface LabPanelProps {
  bridge: ChemistryBridge | null;
  researchSamples: ResearchSample[];
  analysisResults: AnalysisResult[];
  analysedSampleIds: string[];
}

function LabPanel({
  bridge,
  researchSamples,
  analysisResults,
  analysedSampleIds,
}: LabPanelProps) {
  const [selectedSampleId, setSelectedSampleId] = useState('');
  const [feedback, setFeedback] = useState('');

  const selectedSample = researchSamples.find(
    (sample) => sample.id === selectedSampleId
  );

  const selectedResult = analysisResults.find(
    (result) => result.sampleId === selectedSampleId
  );

  const isAlreadyAnalysed =
    selectedSampleId.length > 0 &&
    analysedSampleIds.includes(selectedSampleId);

  const handleAnalyze = () => {
    if (!selectedSample) {
      setFeedback('Select a collected sample first.');
      return;
    }

    if (!bridge) {
      setFeedback('The laboratory is not ready. Please try again.');
      return;
    }

    const result = bridge.analyzeSample(selectedSample.id);

    if (!result) {
      setFeedback('The laboratory is not ready. Please try again.');
      return;
    }

    if (!result.ok) {
      setFeedback(CHEMISTRY_ERROR_MESSAGES[result.error]);
      return;
    }

    setFeedback(
      result.duplicate
        ? 'This sample has already been analyzed.'
        : 'Analysis completed.'
    );
  };

  return (
    <section>
      <div className="quest-icon">⚗</div>
      <h3>Research Laboratory</h3>

      <p className="info-description">
        Review collected mineral samples and examine their in-game
        research records.
      </p>

      <div className="quest-objective">
        <span>COLLECTED RESEARCH SAMPLES · {researchSamples.length}</span>

        {researchSamples.length === 0 && (
          <p>
            No research samples available. Explore the world and
            collect a mineral sample first.
          </p>
        )}

        {researchSamples.map((sample) => {
          const isSelected = sample.id === selectedSampleId;
          const isAnalysed = analysedSampleIds.includes(sample.id);

          return (
            <button
              key={sample.id}
              type="button"
              className={
                isSelected ? 'nav-item active' : 'nav-item'
              }
              onClick={() => {
                setSelectedSampleId(sample.id);
                setFeedback('');
              }}
              style={{
                display: 'block',
                width: '100%',
                marginTop: '8px',
                textAlign: 'left',
              }}
            >
              <span>{isAnalysed ? '✓' : '◇'}</span>{' '}
              {sample.displayName}
              <small
                style={{
                  display: 'block',
                  marginLeft: '24px',
                  opacity: 0.75,
                }}
              >
                {isAnalysed ? 'ANALYZED' : 'AWAITING ANALYSIS'}
              </small>
            </button>
          );
        })}
      </div>

      {selectedSample && (
        <div className="quest-objective">
          <span>SELECTED SAMPLE</span>
          <p>{selectedSample.displayName}</p>
          <p>Sample ID: {selectedSample.id}</p>

          <button
            type="button"
            className="nav-item active"
            onClick={handleAnalyze}
            disabled={!bridge || isAlreadyAnalysed}
            style={{
              width: '100%',
              marginTop: '12px',
              opacity:
                !bridge || isAlreadyAnalysed ? 0.55 : 1,
              cursor:
                !bridge || isAlreadyAnalysed
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {isAlreadyAnalysed
              ? 'ANALYSIS COMPLETED'
              : 'ANALYZE SAMPLE'}
          </button>
        </div>
      )}

      {feedback && (
        <p className="info-description" role="status">
          {feedback}
        </p>
      )}

      {selectedResult && (
        <div className="quest-objective">
          <span>ANALYSIS REPORT</span>
          <h4>{selectedResult.title}</h4>
          <p>{selectedResult.summary}</p>
          <p>
            RESULT CODE: {selectedResult.resultCode}
          </p>
          <p>
            IDENTIFICATION STATUS:{' '}
            {selectedResult.identificationStatus.toUpperCase()}
          </p>
          <p>
            VERIFIED: {selectedResult.isVerified ? 'YES' : 'NO'}
          </p>
          <p className="info-description">
            {selectedResult.disclaimer}
          </p>
        </div>
      )}
    </section>
  );
}

export default LabPanel;
