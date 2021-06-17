import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Button,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
  LogBox,
  Linking,
} from 'react-native';
import * as RNIap from 'react-native-iap';
import axios from 'axios'

LogBox.ignoreLogs(['Warning: ...']);
LogBox.ignoreAllLogs();

let purchaseUpdatedListener;
let purchaseErrorListener;

const items = Platform.select({
  ios: ['rniap_test'],
  android: [''],
});

const initFormData = obj => {
  let formData = new FormData();
  for (let key in obj) {
    formData.append(key, obj[key]);
  }
  return formData;
};

export default function App() {
  const [purchased, setPurchased] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const validate = async receiptData => {
    // setLoading(true);
    // console.log(receiptData)
    const receiptBody = {
      'receipt-data': receiptData,
      password: '4025531d063f46cd98dd43b1f639cef1',
    };

    // let token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOlwvXC9sbC1hcGktZGV2LjRhbGFicy5pb1wvbW9iaWxlXC92MVwvYXV0aFwvbG9naW4iLCJpYXQiOjE2MjM3NTYyMzYsImV4cCI6MTYzMTUzMjIzNiwibmJmIjoxNjIzNzU2MjM2LCJqdGkiOiJsM3BBdEhCRnE3MnJkR1RkIiwic3ViIjoyNywicHJ2IjoiODY2NWFlOTc3NWNmMjZmNmI4ZTQ5NmY4NmZhNTM2ZDY4ZGQ3MTgxOCIsImlzX2VtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc19hY2NvdW50X2FjdGl2ZSI6dHJ1ZX0.ZzxW-JYTuvb7oEAd5z-4sbEZEwWIl6jLd9jJiGMaKsU"
    // let data = initFormData({
    //   'subscription-data': receiptData,
    //   'type': 'ios',
    // });

    // const requestOptions = {
    //   headers: {
    //     Authorization: "Bearer " + token
    //   },
    // };

    // const response = await axios.post(
    //   `http://ll-api-dev.4alabs.io/mobile/v1/subscriptions/subscribe`,
    //   data,
    //   requestOptions
    // );

    const result = await RNIap.validateReceiptIos(receiptBody, true)
      .then(receipt => {
        try {
          const renewalHistory = receipt.latest_receipt_info;
          const expiration = parseInt(renewalHistory[0].expires_date_ms);
          let expired = Date.now() > expiration;
          if (!expired) {
            setPurchased(true);
            setLoading(false);
          } else {
            setLoading(false);
            setPurchased(false);
            Alert.alert(
              'Süre doldu',
              'abonelik süreniz bitmiştir uygulamaya giriş için lütfen tekrar abone olunuz',
            );
          }
        } catch (error) {}
      })
      .catch(err => {
        console.log(err);
      });
    console.log(result)

  };

  useEffect(() => {
    purchaseErrorListener = RNIap.purchaseErrorListener(error => {
      if (error['responseCode'] === '2') {
        //user cancelled
        console.log('user cancelled');
      } else {
        Alert.alert('ERROR', 'There is an error ' + error['code']);
      }
    });

    purchaseUpdatedListener = RNIap.purchaseUpdatedListener(purchase => {
      try {
        const receipt = purchase.transactionReceipt;
        console.log('purchase data',JSON.stringify(purchase , 2 ,null))
        validate(receipt);
      } catch (error) {
        setPurchased(false);
      }
    });

    RNIap.initConnection()
      .catch(() => {
        console.log('error connecting to store');
      })
      .then(() => {
        console.log('connected to store ...');
        RNIap.getSubscriptions(items)
          .then(res => {
            setProducts(res);
          })
          .catch(() => {
            console.log('error finding purchases');
          });

        RNIap.getPurchaseHistory()
          .then(res => {
            const receipt = res[res.length - 1].transactionReceipt;
            if (receipt) {
              validate(receipt);
            }
          })
          .catch(() => {});
      });
  }, []);

  const startSubscription = async() => {
    RNIap.requestSubscription(products[0].productId)
  }

  return (
    <>
      {loading ? (
        <View
          style={{
            backgroundColor: 'white',
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <ActivityIndicator />
        </View>
      ) : (
        <SafeAreaView style={{backgroundColor: 'white', flex: 1}}>
          {purchased ? (
            <View>
              <Text>Welcome to the app</Text>
            </View>
          ) : products.length > 0 ? (
            <View style={styles.container}>
              <StatusBar barStyle="dark-content" />
              <Text style={styles.text}>{products[0]?.title}</Text>
              <Text style={styles.text}>{products[0]?.localizedPrice}</Text>
              <Text>{'\u2b24'} Add free access to entire app</Text>
              <Button
                title="Purchase"
                onPress={() => startSubscription()}
              />
              <Button
                title="Open Settings"
                onPress={() => Linking.openSettings()}
              />
            </View>
          ) : (
            <ActivityIndicator />
          )}
        </SafeAreaView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 20,
    marginVertical: 3,
  },
});
