import clsx from 'clsx';
import { useAtomValue } from 'jotai';
import { displayFunctionsAtom } from 'store/app';
import {
  adjustVaultErrorsAtom,
  collateralActionAtom,
  collateralInputAmountAtom,
  debtActionAtom,
  debtInputAmountAtom,
  vaultAfterAdjustmentAtom,
  vaultToAdjustAtom,
} from 'store/adjustVault';
import { AmountMath } from '@agoric/ertp';
import { makeAdjustVaultOffer } from 'service/vaults';
import VaultAdjustmentDialog from './VaultAdjustmentDialog';
import { useMemo, useState } from 'react';

type TableRowProps = {
  left: string;
  right: string;
};

const TableRow = ({ left, right }: TableRowProps) => {
  return (
    <tr className="text-[13px] leading-[21px]">
      <td className="text-secondary text-left pr-2">{left}</td>
      <td className="text-right font-black">{right}</td>
    </tr>
  );
};

type TableRowWithArrowProps = {
  label: string;
  left: string;
  right: string;
};

const TableRowWithArrow = ({ label, left, right }: TableRowWithArrowProps) => {
  return (
    <tr className="text-[13px] leading-[21px]">
      <td className="text-secondary text-left">{label}</td>
      <td className="font-black text-alternative px-2">{left}</td>
      <td className="font-black text-alternative px-2">&#8594;</td>
      <td className="text-right text-alternative font-black">{right}</td>
    </tr>
  );
};

const AdjustVaultSummary = () => {
  const [isVaultAdjustmentDialogOpen, setIsVaultAdjustmentDialogOpen] =
    useState(false);

  const displayFunctions = useAtomValue(displayFunctionsAtom);
  assert(
    displayFunctions,
    'Adjust vault requires display functions to be loaded',
  );
  const { displayAmount, displayBrandPetname, displayPercent } =
    displayFunctions;

  const debtInputAmount = useAtomValue(debtInputAmountAtom);
  const collateralInputAmount = useAtomValue(collateralInputAmountAtom);
  const debtAction = useAtomValue(debtActionAtom);
  const collateralAction = useAtomValue(collateralActionAtom);
  const { collateralError, debtError } = useAtomValue(adjustVaultErrorsAtom);
  const vaultToAdjust = useAtomValue(vaultToAdjustAtom);
  const vaultAfterAdjustment = useAtomValue(vaultAfterAdjustmentAtom);
  assert(
    vaultToAdjust && vaultAfterAdjustment,
    'Adjust vault requires a vault selected',
  );

  const {
    totalDebt,
    locked,
    params,
    collateralizationRatio,
    createdByOfferId,
    vaultState,
  } = vaultToAdjust;

  const isActive = vaultState === 'active';

  const { newDebt, newLocked, newCollateralizationRatio } =
    vaultAfterAdjustment;

  const newDebtForDisplay = AmountMath.isEqual(newDebt, totalDebt)
    ? '---'
    : `${displayAmount(newDebt, 2, 'locale')} ${displayBrandPetname(
        totalDebt.brand,
      )}`;

  const newLockedForDisplay = AmountMath.isEqual(newLocked, locked)
    ? '---'
    : `${displayAmount(newLocked, 2, 'locale')} ${displayBrandPetname(
        locked.brand,
      )}`;

  const hasErrors = collateralError || debtError;
  const canMakeOffer =
    !hasErrors &&
    isActive &&
    (debtInputAmount?.value || collateralInputAmount?.value);

  const isButtonDisabled = !canMakeOffer;

  const offerButtonLabel = useMemo(() => {
    if (!isActive) {
      assert(
        isButtonDisabled,
        'Button should be disabled when vault is not active',
      );

      return vaultState;
    }

    return 'Adjust Vault';
  }, [isButtonDisabled, isActive, vaultState]);

  const makeAdjustOffer = () => {
    assert(canMakeOffer);

    const collateral = collateralInputAmount
      ? {
          amount: collateralInputAmount,
          action: collateralAction,
        }
      : undefined;

    const debt = debtInputAmount
      ? {
          amount: debtInputAmount,
          action: debtAction,
        }
      : undefined;

    makeAdjustVaultOffer({
      vaultOfferId: createdByOfferId,
      collateral,
      debt,
      onSuccess: () => setIsVaultAdjustmentDialogOpen(true),
    });
  };

  return (
    <>
      <div className="w-full pt-[28px] pb-3 bg-white rounded-10 shadow-card">
        <div className="px-8">
          <h3 className="mb-4 font-serif text-[22px] font-extrabold leading-[35px]">
            Vault Summary
          </h3>
          <h4 className="font-serif font-bold leading-[26px]">
            Confirm Details
          </h4>
          <div className="w-full p-2">
            <table className="w-full">
              <tbody>
                <TableRowWithArrow
                  label="Depositing"
                  left={`${displayAmount(
                    locked,
                    2,
                    'locale',
                  )} ${displayBrandPetname(locked.brand)}`}
                  right={newLockedForDisplay}
                />
                <TableRowWithArrow
                  label="Debt"
                  left={`${displayAmount(
                    totalDebt,
                    2,
                    'locale',
                  )} ${displayBrandPetname(totalDebt.brand)}`}
                  right={newDebtForDisplay}
                />
                <TableRowWithArrow
                  label="Collateralization Ratio"
                  left={
                    collateralizationRatio
                      ? displayPercent(collateralizationRatio, 0) + '%'
                      : 'N/A'
                  }
                  right={
                    newCollateralizationRatio
                      ? displayPercent(newCollateralizationRatio, 0) + '%'
                      : 'N/A'
                  }
                />
              </tbody>
            </table>
          </div>
          <div className="w-full divider"></div>
          <div className="w-full p-2">
            <table className="w-full">
              <tbody>
                <TableRow
                  left="Min. Collateralization Ratio"
                  right={`${displayPercent(
                    params.inferredMinimumCollateralization,
                    0,
                  )}%`}
                />
                <TableRow
                  left="Liquidation Ratio"
                  right={`${displayPercent(params.liquidationMargin, 0)}%`}
                />
                <TableRow
                  left="Stability Fee"
                  right={`${displayPercent(params.stabilityFee, 2)}%`}
                />
              </tbody>
            </table>
          </div>
        </div>
        <div
          className={clsx(
            'transition mt-3 mx-3 p-6 rounded-b-10 bg-opacity-[0.15]',
            canMakeOffer ? 'bg-interPurple' : '',
          )}
        >
          <button
            disabled={isButtonDisabled}
            onClick={makeAdjustOffer}
            className="btn-submit"
          >
            {offerButtonLabel}
          </button>
        </div>
      </div>
      <VaultAdjustmentDialog
        isOpen={isVaultAdjustmentDialogOpen}
        onClose={() => setIsVaultAdjustmentDialogOpen(false)}
      />
    </>
  );
};

export default AdjustVaultSummary;
