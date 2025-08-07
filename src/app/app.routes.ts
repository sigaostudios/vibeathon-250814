import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ConfigurationComponent } from './configuration/configuration.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'config', component: ConfigurationComponent },
    { path: '**', redirectTo: '' }
];
