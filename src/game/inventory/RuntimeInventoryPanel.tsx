
import { useRef, useState } from 'react';
import type { RuntimeInventoryState } from './RuntimeInventorySystem';
import type { ElementRecord } from '../elements/ElementCatalog';
import type { ResearchSample } from '../chemistry/ChemistrySystem';
import type { ReactionDefinition } from '../chemistry/ReactionEngine';
import type { ReactionExecutionResult } from '../chemistry/ReactionExecutionService';
import {
  CRAFTING_RECIPES,
  type CraftingRecipe,
} from '../crafting/CraftingSystem';
import type {
  CraftingTransactionResult,
} from '../crafting/CraftingTransactionAdapter';

interface RuntimeInventoryPanelProps {
  inventory: RuntimeInventoryState;
  elements: readonly ElementRecord[];
  researchSamples: readonly ResearchSample[];
  onCraftingTransaction: (
    transactionId: string,
    recipeId: string,
  ) => CraftingTransactionResult;
  onRemoveResource: (
    resourceId: string,
  ) => {
    success: boolean;
    message?: string;
  };
  approvedReactions?: readonly ReactionDefinition[];
  onReactionExecution?: (
    reactionId: string,
    transactionId: string,
  ) => ReactionExecutionResult;
}

interface ActionFeedback {
  recipeId: string;
  message: string;
  success: boolean;
}

interface ReactionFeedback {
  reactionId: string;
  message: string;
  success: boolean;
}

function RuntimeInventoryPanel({
  inventory,
  elements,
  researchSamples,
  onCraftingTransaction,
  onRemoveResource,
  approvedReactions = [],
  onReactionExecution,
}: RuntimeInventoryPanelProps) {
  const [removeFeedback, setRemoveFeedback] = useState<{
    resourceId: string;
    message: string;
    success: boolean;
  } | null>(null);

  const [craftFeedback, setCraftFeedback] =
    useState<ActionFeedback | null>(null);

  const [reactionFeedback, setReactionFeedback] =
    useState<ReactionFeedback | null>(null);

  const transactionSequence = useRef(0);

  const resources = Object.entries(inventory.resources);

  const totalQuantity = resources.reduce(
    (total, [, quantity]) => total + quantity,
    0,
  );

  const approvedRecipes = Object.values(CRAFTING_RECIPES).filter(
    (recipe) => recipe.status === 'APPROVED',
  );

  const handleRemove = (resourceId: string) => {
    const result = onRemoveResource(resourceId);

    setRemoveFeedback({
      resourceId,
      message: result.message ?? (
        result.success
          ? 'Removed 1 resource.'
          : 'Unable to remove resource.'
      ),
      success: result.success,
    });
  };

  const getAvailableQuantity = (resourceId: string): number => {
    return inventory.resources[resourceId] ?? 0;
  };

  const hasRequiredMaterials = (recipe: CraftingRecipe): boolean => {
    return recipe.ingredients.every(
      (ingredient) =>
        getAvailableQuantity(ingredient.resourceId) >=
        ingredient.quantity,
    );
  };

  const hasReactionMaterials = (
    reaction: ReactionDefinition,
  ): boolean => {
    return reaction.inputs.every(
      (input) =>
        getAvailableQuantity(input.resourceId) >= input.quantity,
    );
  };

  const handleCraft = (recipe: CraftingRecipe) => {
    if (!hasRequiredMaterials(recipe)) {
      setCraftFeedback({
        recipeId: recipe.id,
        message: 'Not enough materials to craft this recipe.',
        success: false,
      });
      return;
    }

    transactionSequence.current += 1;

    const transactionId = [
      'craft',
      recipe.id,
      Date.now(),
      transactionSequence.current,
    ].join('-');

    const result = onCraftingTransaction(
      transactionId,
      recipe.id,
    );

    setCraftFeedback({
      recipeId: recipe.id,
      message: result.success
        ? `Crafted successfully: ${result.produced.quantity} × ${result.produced.resourceId}.`
        : result.message,
      success: result.success,
    });
  };

  const handleReaction = (reaction: ReactionDefinition) => {
    if (!onReactionExecution) {
      setReactionFeedback({
        reactionId: reaction.id,
        message: 'Reaction execution service is not connected.',
        success: false,
      });
      return;
    }

    if (!hasReactionMaterials(reaction)) {
      setReactionFeedback({
        reactionId: reaction.id,
        message: 'Not enough materials to execute this reaction.',
        success: false,
      });
      return;
    }

    transactionSequence.current += 1;

    const transactionId = [
      'reaction',
      reaction.id,
      Date.now(),
      transactionSequence.current,
    ].join('-');

    const result = onReactionExecution(
      reaction.id,
      transactionId,
    );

    setReactionFeedback({
      reactionId: reaction.id,
      message: result.success
        ? 'Reaction completed successfully.'
        : result.message,
      success: result.success,
    });
  };

  return (
    <section className="inventory-panel">
      <h3>Explorer's Bag</h3>

      <p className="info-description">
        View your collected resources and their current quantities.
      </p>

      <div className="quest-objective">
        <strong>RESOURCES · {totalQuantity}</strong>

        {resources.length === 0 ? (
          <p>Your inventory is empty.</p>
        ) : (
          resources.map(([resourceId, quantity]) => (
            <div
              key={resourceId}
              style={{
                display: 'block',
                width: '100%',
                minWidth: 0,
                padding: '12px',
                marginTop: '10px',
                border: '1px solid #d5b878',
                borderRadius: '8px',
                background: '#20352a',
                boxSizing: 'border-box',
              }}
            >
              <strong
                style={{
                  display: 'block',
                  overflowWrap: 'anywhere',
                  color: '#f0d99d',
                }}
              >
                {resourceId}
              </strong>

              <p style={{ margin: '6px 0 12px' }}>
                Quantity: {quantity}
              </p>

              <button
                type="button"
                onClick={() => handleRemove(resourceId)}
                disabled={quantity <= 0}
              >
                Remove 1
              </button>

              {removeFeedback?.resourceId === resourceId && (
                <p
                  role="status"
                  style={{
                    margin: '8px 0 0',
                    color: removeFeedback.success
                      ? '#a7e3b1'
                      : '#ffaaaa',
                  }}
                >
                  {removeFeedback.message}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      <div className="quest-objective">
        <strong>CRAFTING · {approvedRecipes.length} APPROVED</strong>

        {approvedRecipes.length === 0 ? (
          <p>No approved crafting recipes are available yet.</p>
        ) : (
          approvedRecipes.map((recipe) => {
            const canCraft = hasRequiredMaterials(recipe);

            return (
              <div
                key={recipe.id}
                style={{
                  display: 'block',
                  width: '100%',
                  minWidth: 0,
                  padding: '12px',
                  marginTop: '10px',
                  border: '1px solid #d5b878',
                  borderRadius: '8px',
                  background: '#20352a',
                  boxSizing: 'border-box',
                }}
              >
                <strong
                  style={{
                    display: 'block',
                    overflowWrap: 'anywhere',
                    color: '#f0d99d',
                  }}
                >
                  {recipe.id}
                </strong>

                <p style={{ margin: '10px 0 6px' }}>
                  REQUIRED MATERIALS
                </p>

                {recipe.ingredients.map((ingredient) => {
                  const available = getAvailableQuantity(
                    ingredient.resourceId,
                  );

                  const sufficient =
                    available >= ingredient.quantity;

                  return (
                    <p
                      key={ingredient.resourceId}
                      style={{
                        margin: '4px 0',
                        overflowWrap: 'anywhere',
                        color: sufficient ? '#a7e3b1' : '#ffaaaa',
                      }}
                    >
                      {ingredient.resourceId}: {available} /{' '}
                      {ingredient.quantity}
                    </p>
                  );
                })}

                <p style={{ marginTop: '12px' }}>
                  OUTPUT
                </p>

                <p>
                  {recipe.output.quantity} ×{' '}
                  {recipe.output.resourceId}
                </p>

                <button
                  type="button"
                  onClick={() => handleCraft(recipe)}
                  disabled={!canCraft}
                >
                  {canCraft ? 'Craft' : 'Insufficient materials'}
                </button>

                {craftFeedback?.recipeId === recipe.id && (
                  <p
                    role="status"
                    style={{
                      margin: '8px 0 0',
                      color: craftFeedback.success
                        ? '#a7e3b1'
                        : '#ffaaaa',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {craftFeedback.message}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="quest-objective">
        <strong>
          CHEMICAL REACTIONS · {approvedReactions.length} APPROVED
        </strong>

        {approvedReactions.length === 0 ? (
          <p>
            No approved chemical reactions are available yet.
            Reactions marked REVIEW_REQUIRED cannot be executed.
          </p>
        ) : (
          approvedReactions.map((reaction) => {
            const canExecute = hasReactionMaterials(reaction);

            return (
              <div
                key={reaction.id}
                style={{
                  display: 'block',
                  width: '100%',
                  minWidth: 0,
                  padding: '12px',
                  marginTop: '10px',
                  border: '1px solid #d5b878',
                  borderRadius: '8px',
                  background: '#20352a',
                  boxSizing: 'border-box',
                }}
              >
                <strong
                  style={{
                    display: 'block',
                    overflowWrap: 'anywhere',
                    color: '#f0d99d',
                  }}
                >
                  {reaction.id}
                </strong>

                <p style={{ margin: '10px 0 6px' }}>
                  INPUT MATERIALS
                </p>

                {reaction.inputs.map((input) => {
                  const available = getAvailableQuantity(
                    input.resourceId,
                  );

                  const sufficient = available >= input.quantity;

                  return (
                    <p
                      key={input.resourceId}
                      style={{
                        margin: '4px 0',
                        overflowWrap: 'anywhere',
                        color: sufficient ? '#a7e3b1' : '#ffaaaa',
                      }}
                    >
                      {input.resourceId}: {available} / {input.quantity}
                    </p>
                  );
                })}

                <p style={{ marginTop: '12px' }}>
                  OUTPUT MATERIALS
                </p>

                {reaction.outputs.map((output) => (
                  <p
                    key={output.resourceId}
                    style={{
                      margin: '4px 0',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {output.quantity} × {output.resourceId}
                  </p>
                ))}

                <button
                  type="button"
                  onClick={() => handleReaction(reaction)}
                  disabled={!canExecute || !onReactionExecution}
                >
                  {!onReactionExecution
                    ? 'Service unavailable'
                    : canExecute
                      ? 'Execute reaction'
                      : 'Insufficient materials'}
                </button>

                {reactionFeedback?.reactionId === reaction.id && (
                  <p
                    role="status"
                    style={{
                      margin: '8px 0 0',
                      color: reactionFeedback.success
                        ? '#a7e3b1'
                        : '#ffaaaa',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {reactionFeedback.message}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="quest-objective">
        <strong>ELEMENT RECORDS · {elements.length}</strong>

        {elements.map((element) => (
          <div key={element.id}>
            <p>{element.symbol} · {element.name}</p>
            <p>{element.classification}</p>
            <p>Status: {element.identificationStatus}</p>
          </div>
        ))}
      </div>

      <div className="quest-objective">
        <strong>RESEARCH SAMPLES · {researchSamples.length}</strong>

        {researchSamples.map((sample) => (
          <p key={sample.id}>{sample.id}</p>
        ))}
      </div>
    </section>
  );
}

export default RuntimeInventoryPanel;
