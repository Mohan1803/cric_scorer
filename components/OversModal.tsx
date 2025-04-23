import React, { useRef, useEffect } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useGameStore } from '../store/gameStore';

const OversModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const overs = useGameStore(state => state.oversData);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible && scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [visible]);


  const totalInnings = [1, 2]

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1, padding: 20, backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
          Over History
        </Text>

        <ScrollView ref={scrollRef}>
          {totalInnings.map(a => (<View><Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
            Innings {a}
          </Text>{overs.filter((e) => e.innings === a).map((over, i) => (
            <View key={i} style={{ marginBottom: 16 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>
                Over {over.overNumber + 1}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {over.deliveries.map((ball, idx) => {
                  const bgColor = ball.isWicket
                    ? '#ef5350'
                    : ball.isExtra
                      ? '#bbdefb'
                      : ball.runs === 4
                        ? '#ffe082'
                        : ball.runs === 6
                          ? '#a5d6a7'
                          : '#eeeeee';

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
                      <Text style={{ fontWeight: 'bold' }}>{displayText}</Text>
                      {ball.isWicket && ball.wicketType && (
                        <Text style={{ fontSize: 10, color: '#fff' }}>
                          ({ball.wicketType})
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}</View>))}
        </ScrollView>

        <TouchableOpacity
          onPress={onClose}
          style={{ marginTop: 20, alignSelf: 'center' }}
        >
          <Text style={{ fontSize: 18, color: 'blue' }}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default OversModal;
