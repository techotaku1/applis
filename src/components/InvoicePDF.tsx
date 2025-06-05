'use client';

import React from 'react';

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';

import { getCurrentColombiaDate, formatColombiaDateTime } from '~/utils/dates';
import { formatTotalHours } from '~/utils/formulas';

import type { CleaningService, Property } from '~/types';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottom: 1,
    paddingBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    width: 200,
    alignItems: 'flex-end',
  },
  logo: {
    width: 300,
    height: 100,
    marginBottom: 10,
    marginTop: -15,
    marginLeft: -15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 16,
    marginBottom: 10,
  },
  date: {
    fontSize: 10,
    marginBottom: 4,
  },
  invoiceNumberSmall: {
    fontSize: 12,
    marginBottom: 10,
  },
  serviceDescription: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  table: {
    marginTop: 10,
  },
  mainTable: {
    width: '100%',
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    backgroundColor: '#f0f0f0',
    padding: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    padding: 8,
  },
  tableCell: {
    padding: 8,
    fontSize: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    borderTop: 1,
    paddingTop: 8,
  },
  col1: { width: '40%' },
  col2: { width: '20%' },
  col3: { width: '20%' },
  col4: { width: '20%' },
  totals: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalLine: {
    marginBottom: 8, // Add spacing between total lines
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 10,
    color: 'gray',
  },
  client: {
    marginBottom: 20,
    padding: 10,
    borderBottom: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  dateRange: {
    fontSize: 12,
    marginTop: 5,
    color: '#666',
  },
  extraServicesRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    padding: 8,
    backgroundColor: '#f5f5f5',
  },
  extraServiceItem: {
    paddingVertical: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  extraServiceLabel: {
    fontSize: 10,
    color: '#666',
    paddingRight: 8,
  },
  extraServiceAmount: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});

interface InvoicePDFProps {
  services: CleaningService[];
  property: Property;
  startDate: Date;
  endDate: Date;
}

function calculateServiceAmount(
  service: CleaningService,
  property: Property
): number {
  if (service.isRefreshService) {
    return property.refreshRate;
  }

  switch (property.rateType) {
    case 'HOURLY_USD':
    case 'HOURLY_FL':
      return property.regularRate * service.hoursWorked;
    case 'DAILY_USD':
    case 'DAILY_FL':
    case 'PER_APT_FL':
      return property.regularRate;
    default:
      return 0;
  }
}

export function InvoicePDF({
  services,
  property,
  startDate,
  endDate,
  withTax = false,
}: InvoicePDFProps & { withTax?: boolean }) {
  // Calculate total amount including additional fees
  const totalAmount = services.reduce((sum, service) => {
    const serviceAmount = calculateServiceAmount(service, property);
    const laundryFee = service.laundryFee || 0;
    const refreshFee = service.refreshFee || 0;
    return sum + serviceAmount + laundryFee + refreshFee;
  }, 0);

  const tax = withTax ? totalAmount * 0.07 : 0;
  const total = totalAmount + tax;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image style={styles.logo} src="/logo.jpg" />
            <Text style={styles.date}>
              {formatColombiaDateTime(getCurrentColombiaDate())}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.invoiceNumberSmall}>
              {new Date().getFullYear()}-
              {String(Math.floor(Math.random() * 10000)).padStart(4, '0')}
            </Text>
          </View>
        </View>

        <View style={styles.client}>
          <Text style={styles.clientName}>
            {property.clientName.toUpperCase()} - {property.name}
          </Text>
          <Text style={styles.dateRange}>
            Period: {formatColombiaDateTime(startDate)} to{' '}
            {formatColombiaDateTime(endDate)}
          </Text>
        </View>

        {/* Updated Services Table */}
        <View style={styles.mainTable}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>DESCRIPTION</Text>
            <Text style={styles.col2}>HOURS</Text>
            <Text style={styles.col3}>RATE</Text>
            <Text style={styles.col4}>AMOUNT</Text>
          </View>

          {services.map((service) => {
            const serviceAmount = calculateServiceAmount(service, property);
            const hasLaundry = service.laundryFee > 0;
            const hasRefresh = service.refreshFee > 0;

            return (
              <React.Fragment key={service.id}>
                <View style={styles.tableRow}>
                  <Text style={styles.col1}>
                    {new Date(service.serviceDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.col2}>
                    {formatTotalHours(service.hoursWorked)}
                  </Text>
                  <Text style={styles.col3}>
                    {property.rateType.includes('USD') ? '$' : 'FL'}{' '}
                    {property.regularRate.toFixed(2)}
                  </Text>
                  <Text style={styles.col4}>
                    {property.rateType.includes('USD') ? '$' : 'FL'}{' '}
                    {serviceAmount.toFixed(2)}
                  </Text>
                </View>
                {(hasLaundry || hasRefresh) && (
                  <View
                    key={`${service.id}-extras`}
                    style={styles.extraServicesRow}
                  >
                    <Text style={styles.col1}>Additional Services:</Text>
                    <Text style={styles.col2} />
                    <Text style={styles.col3} />
                    <View style={styles.col4}>
                      {hasLaundry && (
                        <View style={styles.extraServiceItem}>
                          <Text style={styles.extraServiceLabel}>Laundry:</Text>
                          <Text style={styles.extraServiceAmount}>
                            {property.rateType.includes('USD') ? '$' : 'FL'}{' '}
                            {service.laundryFee.toFixed(2)}
                          </Text>
                        </View>
                      )}
                      {hasRefresh && (
                        <View style={styles.extraServiceItem}>
                          <Text style={styles.extraServiceLabel}>Refresh:</Text>
                          <Text style={styles.extraServiceAmount}>
                            {property.rateType.includes('USD') ? '$' : 'FL'}{' '}
                            {service.refreshFee.toFixed(2)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Updated Totals Section */}
        <View style={styles.totals}>
          <Text style={styles.totalLine}>
            Subtotal: {property.rateType.includes('USD') ? '$' : 'FL'}{' '}
            {totalAmount.toFixed(2)}
          </Text>
          {withTax && (
            <Text style={styles.totalLine}>
              Tax (7%): {property.rateType.includes('USD') ? '$' : 'FL'}{' '}
              {tax.toFixed(2)}
            </Text>
          )}
          <Text style={{ fontWeight: 'bold', fontSize: 14, marginTop: 10 }}>
            TOTAL PAYABLE: {property.rateType.includes('USD') ? '$' : 'FL'}{' '}
            {total.toFixed(2)}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Business Current Account</Text>
          <Text>6030690190 Aruba Bank</Text>
          <Text>Email: lisacleanings@gmail.com</Text>
          <Text>Sabana Liber 412 Noord AW</Text>
          <Text>2975672862</Text>
          <Text>Persons. 5000130 KVK# H54443.0</Text>
          <Text>Lis Keyntin Caicedo</Text>
        </View>
      </Page>
    </Document>
  );
}
