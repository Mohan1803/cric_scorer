import React, { useRef, useEffect } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../app/theme';
import { useGameStore } from '../store/gameStore';
import type { OverData, BallRecord } from '../store/gameStore';

const OversModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const overs = useGameStore(state => state.oversData);
  const firstInningsOvers = useGameStore(state => state.firstInningsOversData);

  // Types

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible && scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [visible]);



  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1, padding: 20, backgroundColor: colors.background }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: colors.accent }}>
          Over History
        </Text>

        <ScrollView ref={scrollRef}>
          <View>
            <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
              First Innings
            </Text>
            {firstInningsOvers.length === 0 && (
              <Text style={{ fontStyle: 'italic', color: colors.accentWarn, marginBottom: 8 }}>No overs data for first innings.</Text>
            )}
            {firstInningsOvers.map((over: OverData, i: number) => (
              <View key={i} style={{ marginBottom: 16 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>
                  Over {over.overNumber + 1}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {over.deliveries.map((ball: BallRecord, idx: number) => {
                    const bgColor = ball.isWicket
                      ? colors.accentWarn
                      : ball.isExtra
                        ? colors.accentYellow
                        : ball.runs === 4
                          ? colors.accentOrange
                          : ball.runs === 6
                            ? colors.accentPurple
                            : colors.cardAlt;

                    const displayText = ball.isExtra
                      ? `${ball.extraType}(+${ball.runs})`
                      : ball.isWicket
                        ? 'W'
                        : `${ball.runs}`;

                    return (
                      <View
                        key={idx}
                        style={{
                          backgroundColor: bgColor,
                          borderRadius: 6,
                          padding: 8,
                          margin: 4,
                          alignItems: 'center',
                          minWidth: 40,
                        }}
                      >
                        <Text style={{ fontWeight: 'bold', color: colors.text }}>{displayText}</Text>
                        {ball.isWicket && ball.wicketType && (
                          <Text style={{ fontSize: 10, color: colors.text }}>
                            ({ball.wicketType})
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          <View style={{ marginTop: 16 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
              Second Innings
            </Text>
            {overs.length === 0 && (
              <Text style={{ fontStyle: 'italic', color: colors.accentWarn, marginBottom: 8 }}>No overs data for second innings.</Text>
            )}
            {overs.map((over: OverData, i: number) => (
              <View key={i} style={{ marginBottom: 16 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>
                  Over {over.overNumber + 1}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {over.deliveries.map((ball: BallRecord, idx: number) => {
                    const bgColor = ball.isWicket
                      ? colors.accentWarn
                      : ball.isExtra
                        ? colors.accentYellow
                        : ball.runs === 4
                          ? colors.accentOrange
                          : ball.runs === 6
                            ? colors.accentPurple
                            : colors.cardAlt;

                    const displayText = ball.isExtra
                      ? `${ball.extraType}(+${ball.runs})`
                      : ball.isWicket
                        ? 'W'
                        : `${ball.runs}`;

                    return (
                      <View
                        key={idx}
                        style={{
                          backgroundColor: bgColor,
                          borderRadius: 6,
                          padding: 8,
                          margin: 4,
                          alignItems: 'center',
                          minWidth: 40,
                        }}
                      >
                        <Text style={{ fontWeight: 'bold', color: colors.text }}>{displayText}</Text>
                        {ball.isWicket && ball.wicketType && (
                          <Text style={{ fontSize: 10, color: colors.text }}>
                            ({ball.wicketType})
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity
          onPress={onClose}
          style={{ marginTop: 20, alignSelf: 'center', backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 }}
        >
          <Text style={{ fontSize: 18, color: colors.text, fontWeight: 'bold' }}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default OversModal;
